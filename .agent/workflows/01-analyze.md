# Workflow: 01-analyze.md

## 目的
深入分析 spec.md 需求，確保所有功能邊界、非功能需求與例外情況皆被妥善識別。

## 檢查清單
1. [x] 資料來源：CWA OpenData API F-C0032-001。
2. [x] 解析欄位：locationName, startTime, endTime, Wx, PoP, MinT, MaxT, CI。
3. [x] 資料庫：SQLite (weather.db)，資料表 TemperatureForecasts。
4. [x] 後端：FastAPI，包含 GET /, GET /api/cities, GET /api/weather, GET /api/weather/{city_name}。
5. [x] 前端：台灣 22 縣市 SVG 地圖、點擊切換選取、Weather Dashboard、動態 Bar Chart。
6. [x] 使用者體驗：首頁初始狀態不發送全部請求、點擊顯示 Loading、錯誤處理統一為指定繁中文字、RWD 雙/單欄切換。
7. [x] 安全規範：.env 不可進入 Git，API Key 絕不寫死。
