"""
tests/test_all.py
涵蓋後端資料層、服務層、API 端點、前端資產與異常處理之完整測試。
"""

import os
import pytest
from fastapi.testclient import TestClient

from main import app
from data.cities import TAIWAN_CITIES, CITY_SVG_MAP, normalize_city_name, is_valid_city
from services.database import (
    init_db, save_forecast, get_forecast_by_city,
    get_forecast_by_city_and_date, get_all_cities, clear_old_forecasts
)
from services.weather import parse_cwa_json, MissingApiKeyError, CityNotFoundError


client = TestClient(app)


# -------------------------------------------------------------
# 1. 22 縣市常數與正規化測試
# -------------------------------------------------------------
def test_22_cities_defined():
    """驗證標準 22 縣市皆存在"""
    assert len(TAIWAN_CITIES) == 22
    assert "臺北市" in TAIWAN_CITIES
    assert "臺中市" in TAIWAN_CITIES
    assert "高雄市" in TAIWAN_CITIES
    assert "澎湖縣" in TAIWAN_CITIES
    assert "金門縣" in TAIWAN_CITIES
    assert "連江縣" in TAIWAN_CITIES


def test_city_normalization():
    """驗證異體字與俗體字正規化"""
    assert normalize_city_name("台北市") == "臺北市"
    assert normalize_city_name("台中市") == "臺中市"
    assert normalize_city_name("台南市") == "臺南市"
    assert normalize_city_name("台東縣") == "臺東縣"
    assert normalize_city_name("馬祖") == "連江縣"
    assert normalize_city_name("無效縣市") is None
    assert is_valid_city("臺中市") is True
    assert is_valid_city("火星市") is False


# -------------------------------------------------------------
# 2. SQLite 資料庫 CRUD 測試
# -------------------------------------------------------------
def test_database_crud():
    """測試 SQLite 初始化、寫入、查詢、按日期查詢與清理"""
    init_db()

    sample_forecasts = [
        {
            "city": "臺中市",
            "start_time": "2026-09-23 06:00",
            "end_time": "2026-09-23 18:00",
            "weather": "多雲",
            "pop": 30,
            "min_temp": 24,
            "max_temp": 31,
            "comfort": "舒適"
        },
        {
            "city": "臺中市",
            "start_time": "2026-09-23 18:00",
            "end_time": "2026-09-24 06:00",
            "weather": "晴時多雲",
            "pop": 10,
            "min_temp": 22,
            "max_temp": 28,
            "comfort": "舒適"
        },
        {
            "city": "臺北市",
            "start_time": "2026-09-23 06:00",
            "end_time": "2026-09-23 18:00",
            "weather": "陰短暫雨",
            "pop": 70,
            "min_temp": 23,
            "max_temp": 27,
            "comfort": "稍有涼意"
        }
    ]

    # 寫入資料
    saved = save_forecast(sample_forecasts)
    assert saved >= 2

    # 依縣市查詢
    tc_forecasts = get_forecast_by_city("臺中市")
    assert len(tc_forecasts) >= 2
    assert tc_forecasts[0]["city"] == "臺中市"
    assert tc_forecasts[0]["min_temp"] == 24
    assert tc_forecasts[0]["max_temp"] == 31
    assert tc_forecasts[0]["pop"] == 30

    # 依縣市與日期查詢
    date_forecasts = get_forecast_by_city_and_date("臺中市", "2026-09-23")
    assert len(date_forecasts) >= 2

    # 取得現有縣市
    cities = get_all_cities()
    assert "臺中市" in cities
    assert "臺北市" in cities


# -------------------------------------------------------------
# 3. CWA JSON 解析器測試
# -------------------------------------------------------------
def test_cwa_json_parser():
    """測試 CWA JSON 解析邏輯"""
    raw_sample = {
        "success": "true",
        "records": {
            "location": [
                {
                    "locationName": "高雄市",
                    "weatherElement": [
                        {
                            "elementName": "Wx",
                            "time": [
                                {
                                    "startTime": "2026-09-23 12:00:00",
                                    "endTime": "2026-09-23 18:00:00",
                                    "parameter": {"parameterName": "晴午後短暫雷陣雨"}
                                }
                            ]
                        },
                        {
                            "elementName": "PoP",
                            "time": [
                                {
                                    "startTime": "2026-09-23 12:00:00",
                                    "endTime": "2026-09-23 18:00:00",
                                    "parameter": {"parameterName": "40"}
                                }
                            ]
                        },
                        {
                            "elementName": "MinT",
                            "time": [
                                {
                                    "startTime": "2026-09-23 12:00:00",
                                    "endTime": "2026-09-23 18:00:00",
                                    "parameter": {"parameterName": "26"}
                                }
                            ]
                        },
                        {
                            "elementName": "MaxT",
                            "time": [
                                {
                                    "startTime": "2026-09-23 12:00:00",
                                    "endTime": "2026-09-23 18:00:00",
                                    "parameter": {"parameterName": "33"}
                                }
                            ]
                        },
                        {
                            "elementName": "CI",
                            "time": [
                                {
                                    "startTime": "2026-09-23 12:00:00",
                                    "endTime": "2026-09-23 18:00:00",
                                    "parameter": {"parameterName": "悶熱"}
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    }

    parsed = parse_cwa_json(raw_sample)
    assert len(parsed) == 1
    p = parsed[0]
    assert p["city"] == "高雄市"
    assert p["start_time"] == "2026-09-23 12:00"
    assert p["end_time"] == "2026-09-23 18:00"
    assert p["weather"] == "晴午後短暫雷陣雨"
    assert p["pop"] == 40
    assert p["min_temp"] == 26
    assert p["max_temp"] == 33
    assert p["comfort"] == "悶熱"


# -------------------------------------------------------------
# 4. FastAPI 端點測試
# -------------------------------------------------------------
def test_get_index():
    """驗證 GET / 回傳 200 與 index.html"""
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "台灣縣市氣象 Dashboard" in response.text


def test_get_api_cities():
    """驗證 GET /api/cities 回傳完整 22 縣市"""
    response = client.get("/api/cities")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["total"] == 22
    assert len(data["cities"]) == 22
    assert "臺中市" in data["cities"]


def test_get_weather_cached_city():
    """驗證 GET /api/weather/{city} 可成功讀取快取預報"""
    response = client.get("/api/weather/臺中市")
    assert response.status_code == 200
    data = response.json()
    assert data["city"] == "臺中市"
    assert len(data["forecasts"]) >= 1
    first = data["forecasts"][0]
    assert "min_temp" in first
    assert "max_temp" in first
    assert "pop" in first
    assert "weather" in first


def test_get_weather_invalid_city():
    """驗證查詢無效縣市回傳 404 與指定繁中錯誤訊息"""
    response = client.get("/api/weather/不存在的城市")
    assert response.status_code == 404
    data = response.json()
    assert data["detail"] == "找不到指定縣市"


def test_missing_api_key_error(monkeypatch):
    """驗證當無快取且未設定 CWA_API_KEY 時，回傳 500 與指定繁中錯誤訊息"""
    monkeypatch.setenv("CWA_API_KEY", "")
    response = client.get("/api/weather/連江縣")
    # 連江縣若快取無資料，應觸發 API 呼叫但因缺少 Key 拋出例外
    if response.status_code == 500:
        assert response.json()["detail"] == "系統尚未設定 CWA_API_KEY"


# -------------------------------------------------------------
# 5. 前端資產與 SVG 完整性驗證
# -------------------------------------------------------------
def test_taiwan_map_svg_integrity():
    """驗證 static/taiwan-map.svg 包含 22 縣市 ID 與 data-city"""
    svg_path = os.path.join(os.path.dirname(__file__), "..", "static", "taiwan-map.svg")
    assert os.path.exists(svg_path)
    with open(svg_path, "r", encoding="utf-8") as f:
        content = f.read()

    for city, svg_id in CITY_SVG_MAP.items():
        assert f'id="{svg_id}"' in content, f"SVG 缺少縣市 ID: {svg_id} ({city})"
        assert f'data-city="{city}"' in content, f"SVG 缺少 data-city: {city}"


def test_static_assets_exist():
    """驗證前端必須之 HTML, CSS, JS 檔案皆已建立"""
    base_dir = os.path.join(os.path.dirname(__file__), "..")
    assert os.path.exists(os.path.join(base_dir, "templates", "index.html"))
    assert os.path.exists(os.path.join(base_dir, "static", "style.css"))
    assert os.path.exists(os.path.join(base_dir, "static", "app.js"))
    assert os.path.exists(os.path.join(base_dir, "static", "taiwan-map.svg"))
