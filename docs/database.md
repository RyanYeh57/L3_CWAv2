# Database Design

## 1. 資料庫規格

- 資料庫引擎：SQLite 3
- 資料庫檔案：`database/weather.db`
- 資料表：`TemperatureForecasts`

## 2. Table Schema

```sql
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

CREATE INDEX IF NOT EXISTS idx_forecast_city ON TemperatureForecasts(city);
CREATE INDEX IF NOT EXISTS idx_forecast_time ON TemperatureForecasts(start_time, end_time);
```

## 3. Data Dictionary

| 欄位名稱 | 型別 | 說明 | 來源 (CWA API) |
|---|---|---|---|
| `id` | INTEGER | 主鍵 (Auto Increment) | 系統生成 |
| `city` | TEXT | 縣市名稱 (例: 臺中市) | `locationName` |
| `start_time` | TEXT | 預報開始時間 (YYYY-MM-DD HH:MM) | `weatherElement.time.startTime` |
| `end_time` | TEXT | 預報結束時間 (YYYY-MM-DD HH:MM) | `weatherElement.time.endTime` |
| `weather` | TEXT | 天氣現象 (例: 多雲時晴) | `Wx.parameter.parameterName` |
| `pop` | INTEGER | 降雨機率百分比 (例: 20) | `PoP.parameter.parameterName` |
| `min_temp` | INTEGER | 最低溫度 (攝氏) | `MinT.parameter.parameterName` |
| `max_temp` | INTEGER | 最高溫度 (攝氏) | `MaxT.parameter.parameterName` |
| `comfort` | TEXT | 舒適度說明 (例: 舒適至悶熱) | `CI.parameter.parameterName` |
| `created_at` | TIMESTAMP | 寫入資料庫時間戳 | SQLite CURRENT_TIMESTAMP |
