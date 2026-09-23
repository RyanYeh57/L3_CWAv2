# Architecture Design

## 1. System Overview

本系統採用分層架構設計，資料流如下：

```
[Frontend (Browser)]
   │
   ├─ User Clicks Taiwan Map (SVG)
   │
   ▼
[app.js]
   │
   ├─ Fetch GET /api/weather/{city}
   │
   ▼
[FastAPI (main.py)]
   │
   ├─ Query SQLite (services/database.py)
   │     ├─ [Hit & Fresh] ──► Return cached forecast
   │     └─ [Miss or Expired] ──► Call Weather Service
   │
   ▼
[Weather Service (services/weather.py)]
   │
   ├─ Fetch CWA API (F-C0032-001) via httpx
   ├─ Parse JSON (Wx, PoP, MinT, MaxT, CI)
   └─ Save to SQLite (TemperatureForecasts)
   │
   ▼
[FastAPI Response]
   │
   ▼
[app.js UI Update]
   ├─ Render Weather Dashboard Card
   └─ Render Dynamic Bar Chart (MaxT, MinT, PoP)
```

## 2. Component Responsibilities

1. **`main.py`**:
   - Web 服務進入點。
   - 負責掛載靜態檔案（`/static`）及首頁 HTML 渲染。
   - 定義 RESTful API 路由與例外處理中介。
2. **`services/database.py`**:
   - 封裝 SQLite 資料庫連線與查詢生命週期。
   - 提供 `init_db()`, `save_forecast()`, `get_forecast_by_city()`, `get_all_cities()` 等 CRUD 方法。
3. **`services/weather.py`**:
   - 封裝 CWA API 客戶端（使用 `httpx`）。
   - 解析 CWA JSON 格式，轉換為標準 Python 字典物件。
   - 連動資料庫快取寫入。
4. **`data/cities.py`**:
   - 台灣 22 縣市常數清單與 ID 映射字典。
5. **`templates/index.html` & `static/`**:
   - 台灣 SVG 互動地圖。
   - 狀態管理：預設提示、Loading 動畫、錯誤提醒、氣象預報卡片與純 CSS 動態長條圖。
   - 類 Windy 沉浸式視覺化設計：
     - 全螢幕沈浸式地圖底圖（Dark Theme）。
     - 右側浮動圖層控制面板（氣溫 🌡️、雨量 🌧️、天氣 ⛅）。
     - 右下角氣溫漸層色條圖例（5°C 至 36°C）。
     - 浮動毛玻璃詳情抽屜（Floating Weather Drawer）。
     - 地圖縣市溫度熱力著色與氣溫徽章。
