"""Fetch and normalize active CWA tropical cyclone data."""

from __future__ import annotations

import asyncio
import time
from datetime import datetime, timedelta
from typing import Any

import httpx

from services.weather import CwaApiError, get_api_key

CWA_TYPHOON_ENDPOINT = "https://opendata.cwa.gov.tw/api/v1/rest/datastore/W-C0034-005"
CACHE_TTL_SECONDS = 600
_cache: dict[str, Any] | None = None
_cache_expires_at = 0.0
_cache_lock = asyncio.Lock()


def _key(value: str) -> str:
    return "".join(char.lower() for char in value if char.isalnum())


def _get(source: Any, *names: str, default: Any = None) -> Any:
    if not isinstance(source, dict):
        return default
    wanted = {_key(name) for name in names}
    for name, value in source.items():
        if _key(str(name)) in wanted:
            return value
    return default


def _items(value: Any) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, dict):
        return [value]
    return []


def _number(value: Any) -> float | None:
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, dict):
        value = _get(value, "value", "radius", "distance")
    try:
        parsed = float(str(value).strip())
    except (TypeError, ValueError):
        return None
    return parsed if parsed == parsed and abs(parsed) != float("inf") else None


def _radius(value: Any) -> float | None:
    if isinstance(value, dict):
        value = _get(value, "radius", "value", "distance")
    return _number(value)


def _quadrants(value: Any) -> dict[str, float] | None:
    if not isinstance(value, dict):
        return None
    raw = _get(value, "quadrantRadii", "quadrants", default=value)
    if isinstance(raw, dict):
        raw = _get(raw, "radius", "quadrant", default=raw)
    result: dict[str, float] = {}
    if isinstance(raw, dict):
        for direction in ("NE", "SE", "SW", "NW"):
            radius = _number(_get(raw, direction))
            if radius is not None and radius > 0:
                result[direction] = radius
    for item in _items(raw):
        if not isinstance(item, dict):
            continue
        direction = str(_get(item, "dir", "direction", default="")).upper()
        radius = _number(_get(item, "value", "radius"))
        if direction in {"NE", "SE", "SW", "NW"} and radius is not None and radius > 0:
            result[direction] = radius
    return result or None


def _radius_info(point: dict[str, Any], *names: str) -> tuple[float | None, dict[str, float] | None]:
    raw = _get(point, *names)
    return _radius(raw), _quadrants(raw)


def _coordinates(point: dict[str, Any]) -> tuple[float, float] | None:
    latitude = _number(_get(point, "coordinateLatitude", "latitude", "lat"))
    longitude = _number(_get(point, "coordinateLongitude", "longitude", "lon", "lng"))
    coordinate = _get(point, "coordinate", "coordinates")
    if isinstance(coordinate, str):
        values = [part.strip() for part in coordinate.split(",")]
        if len(values) == 2:
            longitude = longitude if longitude is not None else _number(values[0])
            latitude = latitude if latitude is not None else _number(values[1])
    elif isinstance(coordinate, dict):
        latitude = latitude if latitude is not None else _number(_get(coordinate, "latitude", "lat"))
        longitude = longitude if longitude is not None else _number(_get(coordinate, "longitude", "lon", "lng"))
    if latitude is None or longitude is None or not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
        return None
    return latitude, longitude


def _point_time(point: dict[str, Any], forecast: bool) -> str | None:
    direct = _get(point, "fixTime", "dateTime", "forecastTime", "validTime", "time")
    if direct:
        return str(direct)
    initial = _get(point, "initialTime", "issueTime")
    hour = _number(_get(point, "forecastHour", "forecastHr", "leadTime"))
    if initial and hour is not None:
        try:
            base = datetime.fromisoformat(str(initial).replace("Z", "+00:00"))
            return (base + timedelta(hours=hour)).isoformat()
        except ValueError:
            return f"{initial} (+{hour:g}h)"
    return None


def _moving_prediction(point: dict[str, Any]) -> str | None:
    value = _get(point, "movingPrediction")
    for item in _items(value):
        if not isinstance(item, dict):
            continue
        language = str(_get(item, "lang", "language", default="")).lower()
        text = _get(item, "value", "text")
        if text and language.startswith("zh"):
            return str(text)
    first = _items(value)
    return str(_get(first[0], "value", "text")) if first and _get(first[0], "value", "text") else None


def _normalize_point(raw: Any, forecast: bool = False) -> dict[str, Any] | None:
    if not isinstance(raw, dict):
        return None
    coordinates = _coordinates(raw)
    if coordinates is None:
        return None
    lat, lon = coordinates
    radius15, quadrants15 = _radius_info(raw, "circleOf15Ms", "circle15Ms", "c15Ms", "radius15Ms")
    radius25, quadrants25 = _radius_info(raw, "circleOf25Ms", "circle25Ms", "c25Ms", "radius25Ms")
    probability = _radius(
        _get(raw, "radius70PercentProbability", "radius70Percent", "probabilityRadius70Percent")
    )
    result: dict[str, Any] = {
        "time": _point_time(raw, forecast),
        "latitude": lat,
        "longitude": lon,
        "max_wind_speed_ms": _number(_get(raw, "maxWindSpeed")),
        "max_gust_speed_ms": _number(_get(raw, "maxGustSpeed")),
        "pressure_hpa": _number(_get(raw, "pressure", "centralPressure")),
        "radius_15ms_km": radius15,
        "radius_25ms_km": radius25,
    }
    if quadrants15:
        result["radius_15ms_quadrants_km"] = quadrants15
    if quadrants25:
        result["radius_25ms_quadrants_km"] = quadrants25
    if forecast:
        result["forecast_hour"] = _number(_get(raw, "forecastHour", "forecastHr", "leadTime"))
        result["radius_70_percent_km"] = probability
    else:
        result["moving_direction"] = _get(raw, "movingDirection")
        result["moving_speed_kmh"] = _number(_get(raw, "movingSpeed"))
        result["moving_prediction"] = _moving_prediction(raw)
    return result


def normalize_typhoon_json(raw_json: dict[str, Any]) -> dict[str, Any]:
    success = _get(raw_json, "success")
    if str(success).lower() != "true":
        raise CwaApiError("中央氣象署颱風資料回應失敗")
    records = _get(raw_json, "records")
    if not isinstance(records, dict):
        raise CwaApiError("中央氣象署颱風資料格式不正確")
    systems = _get(records, "tropicalCyclones", "tropical_cyclones")
    if systems is None:
        raise CwaApiError("中央氣象署颱風資料缺少熱帶氣旋欄位")
    raw_storms = _get(systems, "tropicalCyclone", "tropical_cyclone", "cyclone", default=[])
    storms: list[dict[str, Any]] = []

    for storm in _items(raw_storms):
        if not isinstance(storm, dict):
            continue
        analysis = _get(storm, "analysisData", "analysis_data", default={})
        forecast = _get(storm, "forecastData", "forecast_data", default={})
        analysis_fixes = _items(_get(analysis, "fix", "position", "positions", default=[]))
        forecast_fixes = _items(_get(forecast, "fix", "position", "positions", default=[]))
        observed = [point for item in analysis_fixes if (point := _normalize_point(item)) is not None]
        forecasts = [point for item in forecast_fixes if (point := _normalize_point(item, forecast=True)) is not None]
        if not observed and not forecasts:
            continue

        current = observed[-1] if observed else None
        english_name = _get(storm, "typhoonName", "nameEn", "englishName")
        chinese_name = _get(storm, "cwaTyphoonName", "nameZh", "chineseName")
        typhoon_number = _get(storm, "cwaTyNo", "typhoonNumber")
        depression_number = _get(storm, "cwaTdNo", "depressionNumber")
        identity = typhoon_number or depression_number or english_name or chinese_name or len(storms) + 1
        storms.append({
            "id": str(identity),
            "name_zh": str(chinese_name) if chinese_name else None,
            "name_en": str(english_name) if english_name else None,
            "classification": "typhoon" if typhoon_number else "tropical_depression" if depression_number else "tropical_cyclone",
            "current": current,
            "history": observed[:-1] if current else [],
            "forecasts": forecasts,
        })

    sent = _get(raw_json, "sent", "updatedAt", "updateTime") or _get(records, "sent", "updatedAt", "updateTime")
    if sent is None:
        result_info = _get(raw_json, "result", default={})
        sent = _get(result_info, "sent", "updatedAt", "updateTime")
    return {
        "status": "success",
        "updated_at": str(sent) if sent else datetime.now().astimezone().isoformat(timespec="seconds"),
        "source": "CWA",
        "cyclones": storms,
    }


async def _fetch_typhoons() -> dict[str, Any]:
    params = {"Authorization": get_api_key()}
    try:
        async with httpx.AsyncClient(timeout=15.0, verify=False) as client:
            response = await client.get(CWA_TYPHOON_ENDPOINT, params=params)
            if response.status_code != 200:
                raise CwaApiError(f"無法取得中央氣象署颱風資料（HTTP {response.status_code}）")
            payload = response.json()
            if not isinstance(payload, dict):
                raise CwaApiError("中央氣象署颱風資料格式不正確")
            return normalize_typhoon_json(payload)
    except CwaApiError:
        raise
    except Exception as exc:
        raise CwaApiError(f"無法取得中央氣象署颱風資料：{exc}") from exc


async def get_typhoons(force_refresh: bool = False) -> dict[str, Any]:
    global _cache, _cache_expires_at
    async with _cache_lock:
        now = time.monotonic()
        if not force_refresh and _cache is not None and now < _cache_expires_at:
            return _cache
        data = await _fetch_typhoons()
        _cache = data
        _cache_expires_at = time.monotonic() + CACHE_TTL_SECONDS
        return data
