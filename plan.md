# 台灣縣市氣象 Dashboard 實作計畫 (Plan)

> 依據 `spec.md` 規範與規格擬定之專案開發執行計畫書。  
> 依循開發流程：**SPEC → PLAN → IMPLEMENT → TEST → VERIFY → DOCUMENT**

---

## 1. 專案願景與目標

打造一個結合 **AI Agent × SDD × CWA API × SQLite × Interactive SVG Map** 的台灣縣市氣象儀表板（Weather Dashboard）。
- 從中央氣象署（CWA）OpenData API（代號 `F-C0032-001`）取得各縣市 36 小時天氣預報資料。
- 經過解析與標準化轉換後寫入本機 SQLite 資料庫作為快取與持久化儲存。
- 後端採用 FastAPI 提供簡潔 RESTful API。
- 前端透過台灣 22 縣市互動式 SVG 地圖，提供流暢的點擊查詢、動態長條圖（Bar Chart）以及多時段天氣預報顯示。
- 支援響應式網頁設計（RWD），在桌面端與行動端皆具備優質體驗。

---

## 2. 專案目錄與模組結構

本專案將依照 `spec.md` 第 4 節規範，組織目錄結構如下：

```text
d:\hw2 CWA\
├── main.py                     # FastAPI 應用程式入口與靜態資源掛載
├── services/
│   ├── __init__.py
│   ├── weather.py              # CWA API 請求、JSON 解析與資料寫入協調
│   └── database.py             # SQLite 資料庫連線、Schema 建立與 CRUD 操作
├── data/
│   ├── __init__.py
│   └── cities.py               # 台灣 22 縣市清單與常數定義
├── database/
│   └── weather.db              # SQLite 資料庫檔案（.gitignore 排除）
├── templates/
│   └── index.html              # 前端主頁面 HTML
├── static/
│   ├── style.css               # 前端樣式與 RWD 佈局
│   ├── app.js                  # 前端互動邏輯、API 呼叫與圖表渲染
│   └── taiwan-map.svg          # 台灣 22 縣市高解析度互動式向量地圖
├── .env                        # 環境變數設定（包含 CWA_API_KEY，需排除於 Git）
├── .env.example                # 環境變數範例檔
├── .gitignore                  # Git 排除規則
├── requirements.txt            # Python 套件相依清單
├── README.md                   # 專案說明文件
├── spec.md                     # 規格說明書
├── plan.md                     # 本執行計畫書
├── verify.md                   # 驗證規範
└── verification-report.md      # 驗證結果報告
```

---

## 3. 核心技術選型與規格

| 領域 | 技術 / 套件 | 用途與規範 |
|---|---|---|
| **後端框架** | FastAPI + Uvicorn | 現代非同步 Python Web 框架，提供 RESTful API 與靜態頁面服務 |
| **HTTP 客戶端** | httpx | 支援異步/同步 HTTP 請求，向 CWA API 請求氣象資料 |
| **環境變數管理** | python-dotenv | 載入 `.env` 中的 `CWA_API_KEY` |
| **資料庫** | SQLite (`sqlite3`) | 輕量化檔案資料庫，快取天氣預報，降低對外部 API 的重複請求負擔 |
| **地圖視覺化** | SVG Taiwan Map | 內建 22 縣市 Path / ID，純前端向量地圖，無須依賴外部 Google Maps |
| **圖表視覺化** | HTML5 / CSS3 / Vanilla JS | 純 CSS Flexbox / 寬度百分比打造動態 Bar Chart，輕量且客製性高 |
| **前端設計** | Modern Glassmorphism + RWD | 美觀的氣象卡片與條狀圖，支援手機與桌面佈局自動適配 |

---

## 4. 資料庫架構設計 (Database Schema)

資料庫檔案路徑：`database/weather.db`  
預報資料表名稱：`TemperatureForecasts`

### 資料表欄位結構 (DDL)

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

### 欄位對應說明

- `id`: 主鍵，自動遞增。
- `city`: 縣市名稱（例如：`臺中市`、`新北市`）。
- `start_time`: 預報開始時間（ISO 8601 或 `YYYY-MM-DD HH:MM`）。
- `end_time`: 預報結束時間。
- `weather`: 天氣現象（來自 CWA `Wx` parameterName）。
- `pop`: 降雨機率百分比（來自 CWA `PoP` parameterName，整數）。
- `min_temp`: 最低溫度攝氏（來自 CWA `MinT` parameterName，整數）。
- `max_temp`: 最高溫度攝氏（來自 CWA `MaxT` parameterName，整數）。
- `comfort`: 舒適度指數說明（來自 CWA `CI` parameterName，如「舒適」、「悶熱」）。
- `created_at`: 資料寫入或更新時間戳記。

---

## 5. 後端服務與 API 規格

### 5.1 資料層服務 (`services/database.py`)
- `init_db()`: 檢查並建立資料表與索引。
- `save_forecast(forecasts: list[dict])`: 批次寫入或更新預報記錄。
- `get_forecast_by_city(city: str) -> list[dict]`: 依縣市查詢最新有效預報（按時段由近至遠排序）。
- `get_forecast_by_city_and_date(city: str, date_str: str) -> list[dict]`: 指定日期查詢。
- `get_all_cities() -> list[str]`: 取得資料庫中現有縣市清單。
- `clear_old_forecasts()`: 定期或更新時清理過期的歷史預報。

### 5.2 氣象服務 (`services/weather.py`)
- `fetch_cwa_forecast(city_name: str | None = None) -> dict`:
  - 呼叫 `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001`
  - 帶入 `Authorization={CWA_API_KEY}`，若有指定縣市可帶入 `locationName={city_name}`。
- `parse_cwa_json(raw_json: dict) -> list[dict]`:
  - 解析 `records.location` 陣列。
  - 將 5 大天氣要素（`Wx`, `PoP`, `MinT`, `MaxT`, `CI`）依時段時間戳整合。
- `update_weather_data(city_name: str | None = None) -> list[dict]`:
  - 串接 Fetch → Parse → Save 至 SQLite。

### 5.3 FastAPI 路由規格 (`main.py`)

1. **`GET /`**
   - 回傳 `templates/index.html`。
2. **`GET /api/cities`**
   - 回傳標準 22 縣市清單：
     ```json
     { "cities": ["基隆市", "臺北市", "新北市", ..., "連江縣"] }
     ```
3. **`GET /api/weather/{city_name}`**
   - 取得指定縣市之時段預報列表：
     - 先從 SQLite 檢查快取（資料新鮮度判斷）。
     - 若無或已過期，則向 CWA API 請求、寫入 DB 後回傳。
     - 回傳結構：
       ```json
       {
         "city": "臺中市",
         "forecasts": [
           {
             "start_time": "2026-09-23 18:00",
             "end_time": "2026-09-24 06:00",
             "weather": "多雲",
             "pop": 30,
             "min_temp": 24,
             "max_temp": 31,
             "comfort": "舒適"
           }
         ],
         "updated_at": "2026-09-23T19:00:00"
       }
       ```
4. **`GET /api/weather`**
   - 回傳所有縣市預報摘要。

---

## 6. 前端介面與互動流程設計

### 6.1 初始載入行為
- 進入網頁，只加載台灣地圖與基礎佈局。
- 嚴格遵守規格：**不要立即對 22 個城市請求氣象 API**，避免造成請求風暴與不必要的 CWA 額度消耗。
- 預設提示狀態：「請點擊地圖選擇縣市」。

### 6.2 台灣地圖 SVG 整合
- 包含台灣本島與外島（澎湖、金門、馬祖）共 22 個行政區 Path。
- 每個縣市元素標記 `id="TW-xxx"` 與 `data-city="臺中市"` 等屬性。
- CSS 支援：
  - `.map-region`: 預設樣式（具微發光或細緻邊界）。
  - `.map-region:hover`: 滑鼠移過懸浮高亮、提示 Tooltip 縣市名稱。
  - `.map-region.selected`: 點擊選中狀態，醒目強調色彩。

### 6.3 點擊查詢與 Loading 狀態
- 點擊任一縣市時：
  1. 地圖相應區域套用 `.selected`。
  2. 右側（或下方）儀表板切換為 Loading 狀態：
     > 「Loading... 正在取得：臺中市」
  3. 發起 `fetch('/api/weather/臺中市')`。
  4. 成功後隱藏 Loading，渲染 Weather Card 與 Bar Chart。

### 6.4 動態長條圖 (Bar Chart)
- 根據各時間區間（通常包含 3 個 12 小時時段預報）動態渲染：
  - **最高溫條 (MaxT)**：以色階紅/橙呈現（例如 `width: (max_temp / 40) * 100%`）。
  - **最低溫條 (MinT)**：以冷色/藍呈現。
  - **降雨機率條 (PoP)**：以天藍色呈現（寬度直接對應 `pop%`）。
- 數值純由資料動態生成，嚴禁靜態寫死。

### 6.5 錯誤處理機制
前端統一攔截並呈現規格定義之繁體中文提示：
- API 呼叫失敗：「無法取得氣象資料」
- DB 讀取錯誤：「資料庫讀取失敗」
- 縣市名稱無效：「找不到指定縣市」
- API Key 缺失：「系統尚未設定 CWA_API_KEY」

### 6.6 響應式佈局 (RWD)
- **Desktop (寬螢幕 ≥ 992px)**：
  - 雙欄分割佈局：左側為互動式台灣地圖，右側為氣象資訊卡與動態圖表。
- **Mobile (行動裝置 < 992px)**：
  - 單欄垂直堆疊佈局：上方地圖 → 中間縣市卡片 → 下方時段預報長條圖。

---

## 7. 分階段執行任務分解 (Tasks Breakdown)

對應 `spec.md` 第 21 節的 20 項 Agent Tasks，規劃七個執行里程碑：

### 階段一：基礎建設與環境設定 (Tasks 1-4)
- **Task 1: 建立 Python 專案基礎環境**
  - 確認 Python 3.12+ 環境，規劃根目錄與各模組結構。
- **Task 2: 建立 `requirements.txt`**
  - 定義依賴套件：`fastapi`, `uvicorn[standard]`, `httpx`, `python-dotenv`。
- **Task 3: 建立 `.env` 與 `.env.example`**
  - 定義 `CWA_API_KEY` 變數與範例檔。
- **Task 4: 建立 `.gitignore`**
  - 嚴格排除 `.env`, `*.db`, `__pycache__/`, `.venv/` 等敏感與暫存檔案。

### 階段二：資料結構與常數定義 (Tasks 5-7)
- **Task 5: 建立 `data/cities.py`**
  - 完整定義台灣 22 個行政區清單（臺北市、新北市、基隆市、桃園市、新竹市、新竹縣、苗栗縣、臺中市、彰化縣、南投縣、雲林縣、嘉義市、嘉義縣、臺南市、高雄市、屏東縣、宜蘭縣、花蓮縣、臺東縣、澎湖縣、金門縣、連江縣）。
- **Task 6: 建立 SQLite 資料庫連線模組 (`database/`)**
  - 實作資料庫檔案初始化與連線管理器。
- **Task 7: 建立 `TemperatureForecasts` 資料表與索引**
  - 執行 DDL，建立欄位包含 `id, city, start_time, end_time, weather, pop, min_temp, max_temp, comfort, created_at`。

### 階段三：服務層核心實作 (Tasks 8-10)
- **Task 8: 實作 CWA API Service (`services/weather.py`)**
  - 使用 `httpx` 發送 GET 請求至 `F-C0032-001`，支援錯誤與超時處理。
- **Task 9: 實作 JSON Parser**
  - 精確解析 CWA JSON 結構，提取 `locationName`, `startTime`, `endTime`, `Wx`, `PoP`, `MinT`, `MaxT`, `CI` 並轉換為標準化字典列表。
- **Task 10: 實作 Database Service (`services/database.py`)**
  - 實作 `save_forecast()`, `get_forecast_by_city()`, `get_forecast_by_city_and_date()`, `get_all_cities()`, `clear_old_forecasts()`。

### 階段四：後端 API 服務 (Task 11)
- **Task 11: 建立 FastAPI 主應用程式 (`main.py`)**
  - 掛載靜態目錄與 HTML 樣板。
  - 實作 `GET /`, `GET /api/weather/{city_name}`, `GET /api/weather`, `GET /api/cities`。
  - 加入妥善的 HTTP Exception 與自訂錯誤回應。

### 階段五：前端視覺化與互動地圖 (Tasks 12-15)
- **Task 12: 建立 Taiwan SVG Map (`static/taiwan-map.svg`)**
  - 繪製完整 22 縣市獨立路徑與外島，設定標準 data 屬性與清晰標籤。
- **Task 13: 實作 Map 點擊與選取互動 (`static/app.js`)**
  - 監聽 SVG 區域之 Hover 與 Click 事件，切換 `.selected` 視覺反饋。
- **Task 14: 實作 Weather Dashboard 卡片**
  - 呈現縣市名稱、天氣現象、氣溫區間、降雨機率、舒適度等資訊。
- **Task 15: 實作動態 Bar Chart**
  - 依預報數據計算長度比例，以 CSS 條狀圖呈現最高溫、最低溫、降雨機率，並處理多時段預報卡片展示。

### 階段六：使用者體驗與介面優化 (Tasks 16-18)
- **Task 16: 實作 Loading 提示**
  - 點擊縣市後顯示「Loading... 正在取得：[縣市名稱]」，資料返回後平滑淡出。
- **Task 17: 實作規格化 Error Handling**
  - 前端捕捉例外並展示對應中文警告訊息（API失敗、DB失敗、無此城市、缺少 API Key 等）。
- **Task 18: 實作 RWD 響應式佈局**
  - 使用 CSS Grid / Flexbox 與 Media Query，適配桌面橫排與手機直排瀏覽。

### 階段七：測試、驗證與文件發布 (Tasks 19-20)
- **Task 19: 建立完整 `README.md`**
  - 包含專案特色、技術架構、安裝運行步驟、環境變數設定指南、API 文件。
- **Task 20: 執行完整測試與驗證**
  - 逐項檢驗 `spec.md` 第 22 節之 Acceptance Criteria（AC-01 至 AC-20）。
  - 依照 `verify.md` 規範輸出 `verification-report.md`。

---

## 8. 驗收標準對應清單 (Acceptance Criteria Mapping)

本計畫實作完成後，將依據以下清單逐條驗證：

| 驗收編號 | 驗收項目 (Acceptance Criteria) | 驗證方式與預期結果 |
|---|---|---|
| **AC-01** | FastAPI 可以啟動 | 透過 `uvicorn main:app` 成功啟動，HTTP 200 存取首頁 |
| **AC-02** | CWA API 可以取得資料 | 使用合法 `CWA_API_KEY` 成功向 CWA 發出請求並獲取 200 回應 |
| **AC-03** | JSON 可以正常解析 | 能從原始回傳中解析出 `Wx`, `PoP`, `MinT`, `MaxT`, `CI` |
| **AC-04** | SQLite 可以建立 | 本機正確生成 `database/weather.db` 檔案 |
| **AC-05** | TemperatureForecasts 可以建立 | 資料庫內存在符合規格 DDL 的預報資料表 |
| **AC-06** | 氣象資料可以寫入 SQLite | 解析後資料能批次 INSERT/REPLACE 儲存 |
| **AC-07** | 可以從 SQLite 查詢資料 | `get_forecast_by_city` 等函式能正確查詢並返回列表 |
| **AC-08** | 22 個縣市存在 | `cities.py` 與 `/api/cities` 包含完整 22 縣市無遺漏 |
| **AC-09** | 台灣地圖可以顯示 | 網頁正常載入 `taiwan-map.svg`，完整顯示本島與離島 |
| **AC-10** | 縣市可以點擊 | 地圖各區塊綁定 Click 事件，點擊具備反饋 |
| **AC-11** | Click 後可以取得城市名稱 | 點擊地圖能觸發並傳遞對應縣市名稱（如「臺中市」） |
| **AC-12** | 可以查詢城市氣象 | 點擊後發起 `/api/weather/{city}` 成功取得資料 |
| **AC-13** | Weather Card 正常 | 顯示氣溫、天氣狀況、降雨機率、舒適度等卡片區塊 |
| **AC-14** | Bar Chart 正常 | 最高溫、最低溫、降雨機率數值轉換為動態長條圖 |
| **AC-15** | 多時間區間正常 | 36 小時內的多個預報時段能個別展開預報卡片與圖表 |
| **AC-16** | Loading 正常 | 點擊發起請求至資料返回期間顯示 Loading 提示 |
| **AC-17** | Error Handling 正常 | 當發生各類異常時，顯示規格指定的明確中文錯誤提示 |
| **AC-18** | RWD 正常 | 螢幕寬度改變時自動於 Desktop 雙欄與 Mobile 單欄間切換 |
| **AC-19** | README 完成 | 具備繁體中文繁詳安裝教學、功能介紹與架構圖 |
| **AC-20** | .env 沒有進入 Git | `.gitignore` 正確忽略 `.env`，`git status` 無 `.env` 追蹤 |

---

## 9. 階段推進與驗證路徑

```text
[SPEC 審閱完成]
      ↓
[PLAN 建立完成 (plan.md)] ← 目前階段
      ↓
[IMPLEMENT 實作推進] (Phase 1 ~ Phase 6)
      ↓
[TEST 自動化與端對端測試] (Phase 7)
      ↓
[VERIFY 嚴謹逐項檢查驗證] (參照 verify.md 產出 verification-report.md)
      ↓
[DOCUMENT 完善 README 與文檔交付]
```
