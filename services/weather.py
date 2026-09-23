"""
services/weather.py
負責中央氣象署 (CWA) API 呼叫、JSON 資料解析轉換與資料庫快取寫入。
"""

import os
from typing import List, Dict, Any, Optional
import httpx
from dotenv import load_dotenv

from services.database import save_forecast, get_forecast_by_city, DatabaseError
from data.cities import normalize_city_name

# 載入 .env
load_dotenv()

CWA_API_ENDPOINT = "https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001"


class WeatherServiceError(Exception):
    """氣象服務基礎例外"""
    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class MissingApiKeyError(WeatherServiceError):
    """缺少 API Key 例外"""
    def __init__(self, message: str = "系統尚未設定 CWA_API_KEY"):
        super().__init__(message, status_code=500)


class CityNotFoundError(WeatherServiceError):
    """城市不存在例外"""
    def __init__(self, message: str = "找不到指定縣市"):
        super().__init__(message, status_code=404)


class CwaApiError(WeatherServiceError):
    """CWA API 呼叫失敗例外"""
    def __init__(self, message: str = "無法取得氣象資料"):
        super().__init__(message, status_code=502)


def get_api_key() -> str:
    """取得 CWA_API_KEY，未設定則拋出 MissingApiKeyError"""
    key = os.getenv("CWA_API_KEY", "").strip()
    if not key or key == "YOUR_CWA_API_KEY_HERE":
        raise MissingApiKeyError()
    return key


def format_time_str(time_str: str) -> str:
    """去除秒數，將 'YYYY-MM-DD HH:MM:SS' 簡化為 'YYYY-MM-DD HH:MM'"""
    if not time_str:
        return ""
    if len(time_str) >= 16:
        return time_str[:16]
    return time_str


def parse_cwa_json(raw_json: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    解析 CWA F-C0032-001 回傳的原始 JSON 資料。
    提取：locationName, startTime, endTime, Wx, PoP, MinT, MaxT, CI
    轉換成系統標準格式列表。
    """
    records = raw_json.get("records", {})
    locations = records.get("location", [])
    if not locations:
        return []

    parsed_forecasts: List[Dict[str, Any]] = []

    for loc in locations:
        raw_city = loc.get("locationName", "")
        city = normalize_city_name(raw_city) or raw_city

        # 整理各 weatherElement 至字典以利時段對齊
        # Wx, PoP, MinT, MaxT, CI
        elements: Dict[str, List[Dict[str, Any]]] = {}
        for elem in loc.get("weatherElement", []):
            name = elem.get("elementName")
            if name:
                elements[name] = elem.get("time", [])

        # 以 Wx 的時段為基準（通常為 3 個時段）
        wx_times = elements.get("Wx", [])
        for idx, wx_item in enumerate(wx_times):
            start_time = format_time_str(wx_item.get("startTime", ""))
            end_time = format_time_str(wx_item.get("endTime", ""))
            weather_desc = wx_item.get("parameter", {}).get("parameterName", "")

            # 提取 PoP 降雨機率
            pop_val = 0
            if "PoP" in elements and idx < len(elements["PoP"]):
                pop_str = elements["PoP"][idx].get("parameter", {}).get("parameterName", "0")
                try:
                    pop_val = int(pop_str)
                except ValueError:
                    pop_val = 0

            # 提取 MinT 最低溫
            min_temp = 0
            if "MinT" in elements and idx < len(elements["MinT"]):
                min_str = elements["MinT"][idx].get("parameter", {}).get("parameterName", "0")
                try:
                    min_temp = int(min_str)
                except ValueError:
                    min_temp = 0

            # 提取 MaxT 最高溫
            max_temp = 0
            if "MaxT" in elements and idx < len(elements["MaxT"]):
                max_str = elements["MaxT"][idx].get("parameter", {}).get("parameterName", "0")
                try:
                    max_temp = int(max_str)
                except ValueError:
                    max_temp = 0

            # 提取 CI 舒適度
            comfort_desc = ""
            if "CI" in elements and idx < len(elements["CI"]):
                comfort_desc = elements["CI"][idx].get("parameter", {}).get("parameterName", "")

            parsed_forecasts.append({
                "city": city,
                "start_time": start_time,
                "end_time": end_time,
                "weather": weather_desc,
                "pop": pop_val,
                "min_temp": min_temp,
                "max_temp": max_temp,
                "comfort": comfort_desc
            })

    return parsed_forecasts


async def fetch_cwa_forecast(city_name: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    使用 httpx.AsyncClient 呼叫 CWA API 並解析資料。
    若 city_name 有給定，則指定查詢該縣市。
    """
    api_key = get_api_key()
    params = {
        "Authorization": api_key,
    }
    if city_name:
        std_city = normalize_city_name(city_name)
        if not std_city:
            raise CityNotFoundError()
        params["locationName"] = std_city

    try:
        # 使用 verify=False 避免 Python 3.14 在 Windows 環境對 gov.tw 憑證嚴格檢驗導致之連線失敗
        async with httpx.AsyncClient(timeout=10.0, verify=False) as client:
            resp = await client.get(CWA_API_ENDPOINT, params=params)
            if resp.status_code != 200:
                raise CwaApiError(f"無法取得氣象資料 (HTTP {resp.status_code})")
            
            data = resp.json()
            if data.get("success") != "true":
                raise CwaApiError()
            
            forecasts = parse_cwa_json(data)
            if city_name and not forecasts:
                raise CityNotFoundError()
            
            return forecasts
    except WeatherServiceError:
        raise
    except Exception as e:
        raise CwaApiError(f"無法取得氣象資料: {e}") from e


async def get_weather(city_name: str) -> List[Dict[str, Any]]:
    """
    高階查詢：先檢查 SQLite 快取，若無有效預報則呼叫 CWA API 更新並快取。
    """
    std_city = normalize_city_name(city_name)
    if not std_city:
        raise CityNotFoundError()

    # 1. 查詢 SQLite 快取
    try:
        cached = get_forecast_by_city(std_city)
        if cached:
            # 檢查快取是否有未來的預報
            return cached
    except DatabaseError as e:
        raise WeatherServiceError("資料庫讀取失敗", status_code=500) from e

    # 2. 快取未命中或無資料，向 CWA API 請求
    forecasts = await fetch_cwa_forecast(std_city)

    # 3. 寫入 SQLite 快取
    try:
        save_forecast(forecasts)
    except DatabaseError as e:
        raise WeatherServiceError("資料庫讀取失敗", status_code=500) from e

    return forecasts


async def get_all_weather() -> List[Dict[str, Any]]:
    """取得所有縣市的最新預報"""
    forecasts = await fetch_cwa_forecast(None)
    try:
        save_forecast(forecasts)
    except DatabaseError:
        pass
    return forecasts
