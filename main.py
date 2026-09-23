"""
main.py
FastAPI 應用程式主入口，提供前端靜態檔案掛載與氣象 RESTful API。
"""

import os
from datetime import datetime
from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from data.cities import TAIWAN_CITIES, normalize_city_name
from services.weather import (
    get_weather,
    get_all_weather,
    MissingApiKeyError,
    CityNotFoundError,
    CwaApiError,
    WeatherServiceError
)
from services.database import DatabaseError, get_all_cities

app = FastAPI(
    title="Taiwan Weather Forecast API",
    description="台灣縣市氣象 Dashboard 後端服務 (FastAPI + SQLite + CWA OpenData)",
    version="1.0.0"
)

# 支援跨來源存取 (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")

# 掛載靜態資源目錄
os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(TEMPLATES_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


# 異常處理器 - 依照 spec.md 嚴格回傳指定繁體中文訊息
@app.exception_handler(MissingApiKeyError)
async def missing_api_key_handler(request: Request, exc: MissingApiKeyError):
    return JSONResponse(status_code=500, content={"detail": exc.message})


@app.exception_handler(CityNotFoundError)
async def city_not_found_handler(request: Request, exc: CityNotFoundError):
    return JSONResponse(status_code=404, content={"detail": exc.message})


@app.exception_handler(CwaApiError)
async def cwa_api_error_handler(request: Request, exc: CwaApiError):
    return JSONResponse(status_code=502, content={"detail": exc.message})


@app.exception_handler(DatabaseError)
async def database_error_handler(request: Request, exc: DatabaseError):
    return JSONResponse(status_code=500, content={"detail": "資料庫讀取失敗"})


@app.exception_handler(WeatherServiceError)
async def weather_service_error_handler(request: Request, exc: WeatherServiceError):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


@app.get("/", response_class=HTMLResponse)
async def index():
    """回傳前端主頁面 index.html"""
    index_path = os.path.join(TEMPLATES_DIR, "index.html")
    if not os.path.exists(index_path):
        raise HTTPException(status_code=404, detail="index.html 尚未建立")
    with open(index_path, "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())


@app.get("/api/cities")
async def get_cities():
    """
    取得 22 個縣市清單 (依照 spec.md 要求)
    """
    return {
        "status": "success",
        "total": len(TAIWAN_CITIES),
        "cities": TAIWAN_CITIES
    }


@app.get("/api/weather/{city_name}")
async def get_city_weather(city_name: str):
    """
    取得指定縣市之氣象預報資料 (包含多個時段)
    """
    std_city = normalize_city_name(city_name)
    if not std_city:
        raise CityNotFoundError("找不到指定縣市")

    forecasts = await get_weather(std_city)
    return {
        "status": "success",
        "city": std_city,
        "forecasts": forecasts,
        "updated_at": datetime.now().isoformat()
    }


@app.get("/api/weather")
async def get_all_weather_data():
    """
    取得所有縣市的氣象預報資料
    """
    forecasts = await get_all_weather()
    return {
        "status": "success",
        "total": len(forecasts),
        "forecasts": forecasts,
        "updated_at": datetime.now().isoformat()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
