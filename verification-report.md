# verification-report.md

## 檢驗目標
依據 `spec.md` 第 22 節之 Acceptance Criteria 與 `verify.md` 規則執行逐項檢驗。

---

## 檢驗結果表

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| AC-01 | FastAPI 可以啟動 | PASS | `main.py` 成功掛載路由與靜態檔案，`tests/test_all.py::test_get_index` 回傳 HTTP 200。 |
| AC-02 | CWA API 可以取得資料 | PASS | `services/weather.py` 實作 `fetch_cwa_forecast`，使用 `httpx.AsyncClient` 呼叫 `F-C0032-001` 並妥善處理授權與異常。 |
| AC-03 | JSON 可以正常解析 | PASS | `tests/test_all.py::test_cwa_json_parser` 成功解析 `Wx`, `PoP`, `MinT`, `MaxT`, `CI` 各欄位。 |
| AC-04 | SQLite 可以建立 | PASS | `database/weather.db` 成功於本機建立，檔案路徑與目錄自動管理。 |
| AC-05 | TemperatureForecasts 可以建立 | PASS | `services/database.py` 執行 DDL 成功建立符合規格包含 10 個欄位之資料表與索引。 |
| AC-06 | 氣象資料可以寫入 SQLite | PASS | `tests/test_all.py::test_database_crud` 成功執行 `save_forecast()` 批次寫入並具備衝突更新邏輯。 |
| AC-07 | 可以從 SQLite 查詢資料 | PASS | `services/database.py` 提供之 `get_forecast_by_city` 與 `get_forecast_by_city_and_date` 查詢驗證通過。 |
| AC-08 | 22 個縣市存在 | PASS | `data/cities.py` 與 `GET /api/cities` 均定義並回傳完整 22 縣市清單，無一遺漏。 |
| AC-09 | 台灣地圖可以顯示 | PASS | `static/taiwan-map.svg` 具備 22 縣市路徑與離島框線，於 `templates/index.html` 正常載入。 |
| AC-10 | 縣市可以點擊 | PASS | `static/app.js` 第 77 行為地圖內全部 `.city-path` 綁定 `click` 事件監聽。 |
| AC-11 | Click 後可以取得城市名稱 | PASS | 點擊地圖區塊觸發讀取 `data-city` 屬性（如「臺中市」）並傳遞給 `selectCity` 與 `loadWeather`。 |
| AC-12 | 可以查詢城市氣象 | PASS | 前端呼叫 `/api/weather/{city_name}`，`tests/test_all.py::test_get_weather_cached_city` 驗證成功回傳預報資料。 |
| AC-13 | Weather Card 正常 | PASS | `templates/index.html` 與 `static/app.js` 即時顯示城市名稱、氣溫區間、天氣狀態、降雨機率與舒適度。 |
| AC-14 | Bar Chart 正常 | PASS | `static/app.js` 動態依溫度與降雨百分比產生最高溫、最低溫、降雨機率長條圖（Bar Chart）。 |
| AC-15 | 多時間區間正常 | PASS | 前端輪詢預報資料陣列，針對 36 小時內的多個時段分別生成時段卡片與圖表。 |
| AC-16 | Loading 正常 | PASS | 點擊縣市後顯示「Loading... 正在取得：[城市名稱]」，資料返回後平滑切換至內容面板。 |
| AC-17 | Error Handling 正常 | PASS | 依規格實作四種指定繁體中文錯誤提示（找不到指定縣市、系統尚未設定 CWA_API_KEY、資料庫讀取失敗、無法取得氣象資料）。 |
| AC-18 | RWD 正常 | PASS | `static/style.css` 透過 `@media (max-width: 991px)` 於桌面端呈現雙欄並列、行動端垂直堆疊佈局。 |
| AC-19 | README 完成 | PASS | 根目錄建立繁體中文 `README.md`，包含架構特色、環境安裝、API 規格與測試指令。 |
| AC-20 | .env 沒有進入 Git | PASS | `.gitignore` 明確排除 `.env`，`git status` 確認 `.env` 未被 Git 追蹤。 |

---

最後：

PASS:
20

FAIL:
0

UNKNOWN:
0
