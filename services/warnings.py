"""Fetch and normalize CWA weather warnings (W-C0033-002)."""

from __future__ import annotations

import asyncio
import time
from typing import Any

import httpx

from services.weather import CwaApiError, format_time_str, get_api_key

CWA_WARNING_ENDPOINT = "https://opendata.cwa.gov.tw/api/v1/rest/datastore/W-C0033-002"
CACHE_TTL_SECONDS = 600
_cache: list[dict[str, Any]] | None = None
_cache_expires_at = 0.0
_cache_lock = asyncio.Lock()


def _as_list(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value
    return [value] if isinstance(value, dict) else []


def parse_warnings(raw: dict[str, Any]) -> list[dict[str, Any]]:
    warnings: list[dict[str, Any]] = []
    for record in _as_list((raw.get("records") or {}).get("record")):
        info = record.get("datasetInfo") or {}
        valid = info.get("validTime") or {}
        content = (record.get("contents") or {}).get("content") or {}

        areas: list[str] = []
        hazards = ((record.get("hazardConditions") or {}).get("hazards") or {}).get("hazard")
        for hazard in _as_list(hazards):
            affected = ((hazard.get("info") or {}).get("affectedAreas") or {}).get("location")
            for loc in _as_list(affected):
                name = loc.get("locationName")
                if name and name not in areas:
                    areas.append(name)

        warnings.append({
            "title": info.get("datasetDescription", ""),
            "start_time": format_time_str(valid.get("startTime", "")),
            "end_time": format_time_str(valid.get("endTime", "")),
            "issue_time": format_time_str(info.get("issueTime", "")),
            "text": (content.get("contentText") or "").strip(),
            "areas": areas,
        })
    return warnings


async def _fetch_warnings() -> list[dict[str, Any]]:
    params = {"Authorization": get_api_key()}
    try:
        async with httpx.AsyncClient(timeout=15.0, verify=False) as client:
            response = await client.get(CWA_WARNING_ENDPOINT, params=params)
            if response.status_code != 200:
                raise CwaApiError(f"無法取得中央氣象署天氣特報（HTTP {response.status_code}）")
            return parse_warnings(response.json())
    except CwaApiError:
        raise
    except Exception as exc:
        raise CwaApiError(f"無法取得中央氣象署天氣特報：{exc}") from exc


async def get_warnings(force_refresh: bool = False) -> list[dict[str, Any]]:
    global _cache, _cache_expires_at
    async with _cache_lock:
        if not force_refresh and _cache is not None and time.monotonic() < _cache_expires_at:
            return _cache
        data = await _fetch_warnings()
        _cache = data
        _cache_expires_at = time.monotonic() + CACHE_TTL_SECONDS
        return data
