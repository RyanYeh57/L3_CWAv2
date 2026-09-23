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