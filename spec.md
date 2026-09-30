# Taiwan Weather Forecast
# AI Agent × SDD × CWA API × SQLite × Interactive Map

## 1. 專案目標

建立一個台灣縣市氣象 Dashboard。

系統從中央氣象署 CWA OpenData API
取得台灣各縣市天氣預報資料。

資料經過解析與整理後，
儲存至 SQLite Database。

前端提供台灣互動式地圖。

使用者點擊縣市後，
顯示該縣市氣象資訊與條狀圖。

---

# 2. 專案核心流程

CWA API
    ↓
JSON
    ↓
JSON Parser
    ↓
Data Transformation
    ↓
SQLite
    ↓
FastAPI
    ↓
Frontend
    ↓
Taiwan Interactive Map
    ↓
Weather Dashboard
    ↓
Bar Chart


---

# 3. 技術棧

## Backend

- Python 3.12+
- FastAPI
- Uvicorn
- httpx
- python-dotenv

## Database

- SQLite

## Frontend

- HTML5
- CSS3
- JavaScript
- Fetch API
- SVG

## Data Visualization

第一版使用：

- HTML
- CSS
- JavaScript

不強制使用 Chart.js。

## Map

使用 SVG Taiwan Map。

不使用 Google Maps。

---

# 4. 專案目錄

weather-app/

├── main.py

├── services/
│   ├── weather.py
│   └── database.py

├── data/
│   └── cities.py

├── database/
│   └── weather.db

├── templates/
│   └── index.html

├── static/
│   ├── style.css
│   ├── app.js
│   └── taiwan-map.svg

├── .env
├── .gitignore
├── requirements.txt
├── README.md
└── spec.md


---

# 5. CWA API

資料來源：

F-C0032-001

一般天氣預報。

API：

https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001

使用：

CWA_API_KEY

取得 API 資料。


---

# 6. JSON 資料處理

系統必須解析 CWA JSON。

至少取得：

- locationName
- startTime
- endTime
- Wx
- PoP
- MinT
- MaxT
- CI

整理成系統自己的資料格式。


---

# 7. SQLite Database

建立：

weather.db

建立資料表：

TemperatureForecasts


欄位：

id
city
start_time
end_time
weather
pop
min_temp
max_temp
comfort
created_at


範例：

| city | start_time | min_temp | max_temp | pop |
|---|---|---:|---:|---:|
| 臺中市 | 2026-09-23 06:00 | 24 | 31 | 30 |
| 臺中市 | 2026-09-23 18:00 | 23 | 28 | 40 |


---

# 8. Database Service

建立：

services/database.py

提供：

save_forecast()

get_forecast_by_city()

get_forecast_by_city_and_date()

get_all_cities()

clear_old_forecasts()


---

# 9. Weather Service

建立：

services/weather.py

負責：

1. 呼叫 CWA API
2. 解析 JSON
3. 將 CWA 格式轉換成系統格式
4. 寫入 SQLite


---

# 10. FastAPI

GET /

回傳 index.html。


GET /api/weather/{city_name}

取得指定縣市氣象資料。


GET /api/weather

取得所有縣市資料。


GET /api/cities

取得 22 個縣市。


---

# 11. 台灣互動地圖

使用：

static/taiwan-map.svg

22 個縣市必須可以點擊。

每個縣市：

- 有唯一 ID
- 有 city name
- 可以 hover
- 可以 click
- 可以 selected


---

# 12. 地圖操作

使用者點擊：

臺中市

前端執行：

loadWeather("臺中市")


呼叫：

GET /api/weather/臺中市


取得資料後：

更新 Weather Card

更新 Bar Chart


---

# 13. Weather Dashboard

顯示：

## City

臺中市


## Weather

多雲


## Temperature

24°C ~ 31°C


## Rain Probability

30%


## Comfort

舒適


---

# 14. Bar Chart

至少顯示：

最高溫
最低溫
降雨機率


範例：

最高溫

██████████████████████████ 31°C


最低溫

████████████████████ 24°C


降雨機率

██████ 30%


所有數值必須由 API / Database 動態產生。

不得寫死。


---

# 15. 時間區間

如果 CWA API 回傳多個時間區間：

06:00 ~ 18:00

18:00 ~ 06:00

前端必須顯示多個預報區塊。


例如：

臺中市

06:00 - 18:00

最高溫 █████████ 31°C
最低溫 ███████ 24°C
降雨率 ███ 30%


18:00 - 06:00

最高溫 ███████ 28°C
最低溫 ██████ 23°C
降雨率 ████ 40%


---

# 16. Initial Page

第一次進入網站：

顯示台灣地圖。

不要立即取得所有城市 API。

顯示：

「請點擊地圖選擇縣市」


---

# 17. Loading

點擊縣市後：

Loading...

正在取得：

臺中市


API 完成後：

Loading 隱藏。


---

# 18. Error Handling

API 失敗：

「無法取得氣象資料」

Database 失敗：

「資料庫讀取失敗」

城市不存在：

「找不到指定縣市」

API Key 不存在：

「系統尚未設定 CWA_API_KEY」


---

# 19. RWD

Desktop：

Map | Weather Dashboard


Mobile：

Map

↓

City Information

↓

Bar Chart


---

# 20. Agent Development Workflow

Agent 必須按照：

SPEC

↓

PLAN

↓

IMPLEMENT

↓

TEST

↓

VERIFY

↓

DOCUMENT


---

# 21. Agent Tasks

## Task 1

建立 Python 專案。

## Task 2

建立 requirements.txt。

## Task 3

建立 .env。

## Task 4

建立 .gitignore。

## Task 5

建立 cities.py。

## Task 6

建立 SQLite Database。

## Task 7

建立 TemperatureForecasts。

## Task 8

實作 CWA API Service。

## Task 9

實作 JSON Parser。

## Task 10

實作 Database Service。

## Task 11

建立 FastAPI。

## Task 12

建立 Taiwan SVG Map。

## Task 13

實作 Map Click。

## Task 14

實作 Weather Dashboard。

## Task 15

實作 Bar Chart。

## Task 16

實作 Loading。

## Task 17

實作 Error Handling。

## Task 18

實作 RWD。

## Task 19

建立 README。

## Task 20

執行完整測試。


---

# 22. Acceptance Criteria

[ ] FastAPI 可以啟動

[ ] CWA API 可以取得資料

[ ] JSON 可以正常解析

[ ] SQLite 可以建立

[ ] TemperatureForecasts 可以建立

[ ] 氣象資料可以寫入 SQLite

[ ] 可以從 SQLite 查詢資料

[ ] 22 個縣市存在

[ ] 台灣地圖可以顯示

[ ] 縣市可以點擊

[ ] Click 後可以取得城市名稱

[ ] 可以查詢城市氣象

[ ] Weather Card 正常

[ ] Bar Chart 正常

[ ] 多時間區間正常

[ ] Loading 正常

[ ] Error Handling 正常

[ ] RWD 正常

[ ] README 完成

[ ] .env 沒有進入 Git


---

# 23. Definition of Done

只有以下全部完成：

CWA API
+
JSON Parsing
+
SQLite
+
FastAPI
+
SVG Map
+
Interactive Map
+
Weather Dashboard
+
Bar Chart
+
RWD
+
Testing
+
README

才算完成第一版。


---

# 24. 未來擴充

第一版完成後，可以加入：

- 7 天預報
- 氣溫折線圖
- 降雨機率折線圖
- UV
- 風速
- 風向
- AQI
- 天氣圖示
- 天氣警特報
- LINE Bot
- AI 天氣摘要
- AI 穿衣建議
- AI 旅遊建議

---

# 25. Typhoon Dynamic Map

## 25.1 Goal

在既有台灣天氣地圖加入「颱風動態」圖層，讓使用者查看目前活動中的熱帶氣旋、已觀測路徑、官方預報路徑、預報時間及可取得的風圈資料。此功能是資訊呈現與防災參考，不取代中央氣象署警報或官方預報。

## 25.2 Official Data Source

- Provider: Central Weather Administration (CWA) Open Data.
- Dataset: `W-C0034-005`，熱帶氣旋分析與預報／颱風消息與警報－熱帶氣旋路徑。
- Datastore API: `https://opendata.cwa.gov.tw/api/v1/rest/datastore/W-C0034-005`
- Authentication: use the existing server-side `CWA_API_KEY` as the `Authorization` parameter. Never expose the key to browser JavaScript or HTML.
- Coverage: active tropical cyclones in the western North Pacific and South China Sea, including tropical depressions as supplied by CWA.
- The source includes past/current analysis and future forecast positions. The product document describes normal updates every 6 hours and updates every 3 hours during a Taiwan typhoon warning. Use the source `Sent`/issued time as the displayed data time.
- The product may contain no active cyclone records. This is a valid empty state, not an API failure.

Reference: [CWA product description](https://www.cwa.gov.tw/Data/data_catalog/1-4-1.pdf), [CWA dataset](https://opendata.cwa.gov.tw/dataset/warning/W-C0034-005).

## 25.3 Data Contract

The backend normalizes the CWA response into a stable application schema; frontend code must not depend directly on raw CWA field names.

`GET /api/typhoons` response:

```json
{
  "status": "success",
  "updated_at": "2026-09-30T12:00:00+08:00",
  "source": "CWA",
  "cyclones": [
    {
      "id": "source-storm-id",
      "name_zh": "颱風名稱",
      "name_en": "STORM NAME",
      "classification": "typhoon",
      "current": {
        "time": "2026-09-30T12:00:00+08:00",
        "latitude": 20.5,
        "longitude": 120.5,
        "max_wind_speed_ms": 48,
        "max_gust_speed_ms": 58,
        "pressure_hpa": 930,
        "moving_direction": "WNW",
        "moving_speed_kmh": 10
      },
      "history": [],
      "forecasts": [
        {
          "time": "2026-09-30T18:00:00+08:00",
          "forecast_hour": 6,
          "latitude": 21.0,
          "longitude": 120.0,
          "max_wind_speed_ms": 45,
          "radius_15ms_km": 200,
          "radius_25ms_km": 70,
          "radius_70_percent_km": 120
        }
      ]
    }
  ]
}
```

- `history` contains valid observed/analyzed positions ordered oldest to newest; `current` is the latest valid analyzed position.
- `forecasts` contains valid future positions ordered by forecast time. Convert CWA coordinate strings to numeric latitude/longitude and confirm longitude/latitude order during parsing.
- Names, issue time, coordinates, forecast hour, wind speed, gust, pressure, movement and available 7-level/10-level/70% probability radii are mapped when present. Optional source fields may be `null`; missing optional fields must not invalidate a cyclone.
- Reject non-numeric or out-of-range coordinates and malformed individual points; do not draw invalid points. A cyclone with no valid current or forecast position is omitted and logged.
- Wind speeds remain in metres per second in the API response and are labelled as m/s in the UI. Radius values are in kilometres.

## 25.4 Backend Requirements

- Add a typhoon service that fetches and normalizes `W-C0034-005` using `httpx` and the existing CWA API key.
- Add `GET /api/typhoons`; return HTTP 200 with `cyclones: []` when the source has no active systems.
- Cache a successful normalized response for up to 10 minutes to avoid redundant upstream requests; provide a refresh query or equivalent explicit refresh path that bypasses the cache.
- Apply a finite request timeout. Return a clear HTTP 502 error for upstream/network/invalid-payload failures and HTTP 500 for missing server API configuration. Do not turn an upstream failure into an empty-storm success.
- Do not persist typhoon points in the existing city-forecast SQLite table. The source already carries issue time and refresh cadence; use the bounded in-memory cache for this release.

## 25.5 Map and Interaction Requirements

- Add a clearly labelled `颱風動態` layer control without changing the existing temperature/rain/weather layer behavior.
- Show a storm marker at the latest analyzed position. Its popup/card shows Chinese and English names, classification, observation time, maximum sustained wind, gust, central pressure, movement direction and speed when available.
- Draw observed history as a solid line and forecast positions as a dashed line. Mark forecast points with their valid time/forecast hour and show available forecast intensity data.
- Draw the CWA 70% probability radius and 7-level/10-level wind radii when the corresponding values are supplied. Use clearly different line styles/colors and a legend; do not infer or fabricate missing radii.
- If quadrant wind radii are supplied, draw the corresponding directional extent; otherwise draw the supplied circular radius. Label each radius and its units.
- When more than one cyclone is present, provide a selectable storm list. Selecting a storm highlights it and fits the map to its valid track with sensible padding and zoom limits.
- Provide a time slider and play/pause control over observed and forecast points for the selected cyclone. Keep the official issue time visible and distinguish observed points from forecast points at all times.
- A manual refresh action reloads current data and updates the visible timestamp. Fetch data when the typhoon layer is first opened, not continuously at a high polling rate.
- On mobile, keep the storm selector, timeline and detail card usable without obscuring the map controls.

## 25.6 Empty, Error, and Safety States

- No active cyclones: show `目前沒有可顯示的熱帶氣旋資料` and leave the base map and other weather layers usable.
- Loading: show a visible loading state while the typhoon data is being fetched.
- Upstream/API failure: show an actionable error with retry; preserve already rendered data only if it is clearly marked with its older issue time.
- Display the notice `路徑與風圈為中央氣象署預報資料，具有不確定性；請以官方警報與最新資訊為準。`
- Always attribute CWA as the source. The map must not imply that a forecast path is an exact future track or that a 70% probability circle is a warning boundary.

## 25.7 Acceptance Criteria

- **TY-AC-01**: `GET /api/typhoons` returns normalized data from `W-C0034-005` without exposing the API key.
- **TY-AC-02**: No-active-cyclone source data returns HTTP 200 and an empty-state message, not an error.
- **TY-AC-03**: A sample cyclone renders a current marker, chronological observed path and dashed future path at the correct map coordinates.
- **TY-AC-04**: Selecting each cyclone updates the highlighted path, details and map bounds.
- **TY-AC-05**: Timeline slider and play/pause advance through valid observed and forecast points while preserving the observed/forecast distinction.
- **TY-AC-06**: Wind radii and 70% probability radius render only when valid source values exist, with kilometre labels and a legend.
- **TY-AC-07**: Missing optional fields and malformed individual points do not crash the endpoint or frontend.
- **TY-AC-08**: Upstream timeout, non-success response, malformed payload and missing API key produce the documented error state.
- **TY-AC-09**: Successful responses are cached for no more than 10 minutes; explicit refresh retrieves fresh data.
- **TY-AC-10**: Attribution, issue time and forecast uncertainty notice are visible on desktop and mobile layouts.
- **TY-AC-11**: Existing temperature, precipitation, weather layers and county selection continue to work when the typhoon layer is toggled on and off.
- **TY-AC-12**: The map, storm list, details and timeline remain usable at the existing mobile breakpoint.

## 25.8 Out of Scope for This Release

- Rainfall accumulation/grid overlays, radar/satellite playback and storm-surge/flood impact estimates.
- Creating a new storm forecast or calculating a route from raw coordinates.
- Replacing or reproducing CWA warnings, watches, evacuation guidance or official warning polygons.
- Historical archive search beyond the active systems supplied by the current dataset.
