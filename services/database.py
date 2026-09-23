"""
services/database.py
負責 SQLite 資料庫連線、Schema 建立與 CRUD 操作。
"""

import os
import sqlite3
from typing import List, Dict, Any, Optional
from datetime import datetime

# 資料庫目錄與路徑
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_DIR = os.path.join(BASE_DIR, "database")
DB_PATH = os.path.join(DB_DIR, "weather.db")


class DatabaseError(Exception):
    """資料庫操作例外"""
    pass


def get_connection() -> sqlite3.Connection:
    """取得資料庫連線並啟用 Row 字典轉換"""
    try:
        os.makedirs(DB_DIR, exist_ok=True)
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn
    except Exception as e:
        raise DatabaseError(f"資料庫連線失敗: {e}") from e


def init_db() -> None:
    """初始化資料表與索引"""
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS TemperatureForecasts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    city TEXT NOT NULL,
                    start_time TEXT NOT NULL,
                    end_time TEXT NOT NULL,
                    weather TEXT NOT NULL,
                    pop INTEGER DEFAULT 0,
                    min_temp INTEGER NOT NULL,
                    max_temp INTEGER NOT NULL,
                    comfort TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(city, start_time, end_time) ON CONFLICT REPLACE
                );
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_forecast_city ON TemperatureForecasts(city);
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_forecast_time ON TemperatureForecasts(start_time, end_time);
            """)
            conn.commit()
    except Exception as e:
        raise DatabaseError(f"資料庫初始化失敗: {e}") from e


def save_forecast(forecasts: List[Dict[str, Any]]) -> int:
    """
    儲存或更新天氣預報紀錄。
    若存在相同的 (city, start_time, end_time) 則依 UNIQUE 約束覆蓋更新。
    回傳新增/更新的筆數。
    """
    if not forecasts:
        return 0
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            sql = """
                INSERT INTO TemperatureForecasts 
                (city, start_time, end_time, weather, pop, min_temp, max_temp, comfort, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(city, start_time, end_time) DO UPDATE SET
                    weather = excluded.weather,
                    pop = excluded.pop,
                    min_temp = excluded.min_temp,
                    max_temp = excluded.max_temp,
                    comfort = excluded.comfort,
                    created_at = excluded.created_at;
            """
            now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            data_tuples = [
                (
                    f["city"],
                    f["start_time"],
                    f["end_time"],
                    f.get("weather", ""),
                    int(f.get("pop", 0) or 0),
                    int(f.get("min_temp", 0) or 0),
                    int(f.get("max_temp", 0) or 0),
                    f.get("comfort", ""),
                    now_str
                )
                for f in forecasts
            ]
            cursor.executemany(sql, data_tuples)
            conn.commit()
            return cursor.rowcount
    except Exception as e:
        raise DatabaseError(f"資料庫寫入失敗: {e}") from e


def get_forecast_by_city(city: str) -> List[Dict[str, Any]]:
    """
    依照縣市名稱查詢預報資料，按 start_time 升冪排序。
    """
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, city, start_time, end_time, weather, pop, min_temp, max_temp, comfort, created_at
                FROM TemperatureForecasts
                WHERE city = ?
                ORDER BY start_time ASC;
            """, (city,))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    except Exception as e:
        raise DatabaseError(f"資料庫讀取失敗: {e}") from e


def get_forecast_by_city_and_date(city: str, date_str: str) -> List[Dict[str, Any]]:
    """
    指定縣市與日期 (YYYY-MM-DD) 查詢預報。
    """
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, city, start_time, end_time, weather, pop, min_temp, max_temp, comfort, created_at
                FROM TemperatureForecasts
                WHERE city = ? AND start_time LIKE ?
                ORDER BY start_time ASC;
            """, (city, f"{date_str}%"))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    except Exception as e:
        raise DatabaseError(f"資料庫讀取失敗: {e}") from e


def get_all_cities() -> List[str]:
    """
    取得目前資料庫中所有具備預報紀錄的縣市清單。
    """
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT DISTINCT city FROM TemperatureForecasts ORDER BY city ASC;
            """)
            rows = cursor.fetchall()
            return [row["city"] for row in rows]
    except Exception as e:
        raise DatabaseError(f"資料庫讀取失敗: {e}") from e


def clear_old_forecasts() -> int:
    """
    清理過期的天氣預報（結束時間早於當前時間）。
    """
    try:
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                DELETE FROM TemperatureForecasts WHERE end_time < ?;
            """, (now_str,))
            conn.commit()
            return cursor.rowcount
    except Exception as e:
        raise DatabaseError(f"清理舊資料失敗: {e}") from e


# 初始化資料庫表格
init_db()
