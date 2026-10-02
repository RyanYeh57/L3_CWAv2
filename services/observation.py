"""Fetch and normalize CWA real-time station observations (O-A0003-001)."""

from __future__ import annotations

import asyncio
import time
from typing import Any

import httpx

from services.weather import CwaApiError, get_api_key

CWA_OBSERVATION_ENDPOINT = "https://opendata.cwa.gov.tw/api/v1/rest/datastore/O-A0003-001"
CACHE_TTL_SECONDS = 600
_cache: dict[str, Any] | None = None
_cache_expires_at = 0.0
_cache_lock = asyncio.Lock()


def _number(value: Any) -> float | None:
    """CWA uses -99 / -99.0 (and similar) for missing values."""
    try:
        parsed = float(str(value).strip())
    except (TypeError, ValueError):
        return None
    return None if parsed <= -99 else parsed


def _wgs84(geo: dict[str, Any]) -> tuple[float | None, float | None]:
    for coord in geo.get("Coordinates") or []:
        if coord.get("CoordinateName") == "WGS84":
            return _number(coord.get("StationLatitude")), _number(coord.get("StationLongitude"))
    return None, None


def _extreme(stations: list[dict[str, Any]], field: str, pick) -> dict[str, Any] | None:
    candidates = [s for s in stations if s[field] is not None]
    if not candidates:
        return None
    best = pick(candidates, key=lambda s: s[field])
    return {"value": best[field], "station": best["name"]}


def parse_observations(raw: dict[str, Any]) -> dict[str, Any]:
    stations: list[dict[str, Any]] = []
    obs_time = ""
    for item in (raw.get("records") or {}).get("Station") or []:
        geo = item.get("GeoInfo") or {}
        lat, lon = _wgs84(geo)
        if lat is None or lon is None:
            continue
        element = item.get("WeatherElement") or {}
        weather = element.get("Weather")
        stations.append({
            "id": item.get("StationId", ""),
            "name": item.get("StationName", ""),
            "county": geo.get("CountyName", ""),
            "town": geo.get("TownName", ""),
            "lat": lat,
            "lon": lon,
            "temp": _number(element.get("AirTemperature")),
            "rain": _number((element.get("Now") or {}).get("Precipitation")),
            "wind_speed": _number(element.get("WindSpeed")),
            "wind_dir": _number(element.get("WindDirection")),
            "humidity": _number(element.get("RelativeHumidity")),
            "weather": weather if weather and weather != "-99" else "",
        })
        # "2026-10-02T15:40:00+08:00" -> "2026-10-02 15:40"
        time_str = (item.get("ObsTime") or {}).get("DateTime", "")
        obs_time = max(obs_time, time_str[:16].replace("T", " "))

    return {
        "stations": stations,
        "summary": {
            "obs_time": obs_time,
            "count": len(stations),
            "max_temp": _extreme(stations, "temp", max),
            "min_temp": _extreme(stations, "temp", min),
            "max_rain": _extreme(stations, "rain", max),
            "max_wind": _extreme(stations, "wind_speed", max),
        },
    }


async def _fetch_observations() -> dict[str, Any]:
    params = {"Authorization": get_api_key()}
    try:
        async with httpx.AsyncClient(timeout=20.0, verify=False) as client:
            response = await client.get(CWA_OBSERVATION_ENDPOINT, params=params)
            if response.status_code != 200:
                raise CwaApiError(f"無法取得中央氣象署觀測資料（HTTP {response.status_code}）")
            return parse_observations(response.json())
    except CwaApiError:
        raise
    except Exception as exc:
        raise CwaApiError(f"無法取得中央氣象署觀測資料：{exc}") from exc


async def get_observations(force_refresh: bool = False) -> dict[str, Any]:
    global _cache, _cache_expires_at
    async with _cache_lock:
        if not force_refresh and _cache is not None and time.monotonic() < _cache_expires_at:
            return _cache
        data = await _fetch_observations()
        _cache = data
        _cache_expires_at = time.monotonic() + CACHE_TTL_SECONDS
        return data
