# 新功能設計：即時觀測、天氣特報、雷達、底圖、定位

日期：2026-10-02
參考：https://taiwan-weather-map.vercel.app/

## 目標

在現有「36 小時預報」地圖上，加入「現在」的資料與幾個便利工具。
不改動既有預報、颱風、資料庫邏輯。

## 已確認的資料來源

| 功能 | 來源 | 驗證結果（2026-10-02 實測） |
|---|---|---|
| 即時觀測 | CWA `O-A0003-001` | 200，363 站，含 WGS84 座標、氣溫、日累積雨量、風速風向、濕度、天氣 |
| 天氣特報 | CWA `W-C0033-002` | 200，每則含標題、有效時間、內文、影響縣市 |
| 雷達回波 | RainViewer `weather-maps.json` | 免費、免 key，前端直接取 |

缺值：CWA 以 `-99` / `-99.0` 表示，後端一律轉成 `null`。

## 後端

### `services/observation.py`（新）
- `parse_observations(raw) -> dict`：
  - `stations`: `[{id, name, county, town, lat, lon, temp, rain, wind_speed, wind_dir, humidity, weather}]`
  - `summary`: `{obs_time, count, max_temp, min_temp, max_rain, max_wind}`，每項帶 `{value, station}`
- `get_observations(force_refresh=False)`：記憶體快取 10 分鐘（同 `services/typhoon.py` 模式）。
- 只讀不寫資料庫。

### `services/warnings.py`（新）
- `parse_warnings(raw) -> list`：`[{title, start_time, end_time, issue_time, text, areas}]`
- `get_warnings(force_refresh=False)`：記憶體快取 10 分鐘。

### `main.py` 新路由
- `GET /api/observations`
- `GET /api/warnings`
- 錯誤沿用既有 `MissingApiKeyError` / `CwaApiError` 處理器。

### 測試（`tests/test_all.py`）
- 觀測：`-99` 轉 `null`、統計挑對站、空資料不報錯。
- 特報：解析標題／縣市／時間、空資料回傳 `[]`。

## 前端

### 1. 天氣特報橫幅
- 位置：導覽列下方、置中（桌面在兩側面板之間；手機滿寬）。
- 標題列：「⚠️ 天氣特報 N 則」＋收合鈕。手機預設收合。
- 每則顯示：標題、有效至、內文、影響縣市。
- 0 則或 API 失敗：整條隱藏，不打擾。

### 2. 即時觀測
- 圖層面板新增區塊「即時觀測」：4 個按鈕 **氣溫 / 雨量 / 風 / 濕度**，可再按一次關閉。
- 地圖上以小圓點畫 363 站，顏色依數值（氣溫沿用現有色階）。
- 風：小箭頭，方向＝風向。
- 點測站：popup 顯示該站全部數值與觀測時間。
- 開啟觀測圖層時，縣市溫度標籤暫時隱藏，避免重疊。
- 「全台即時概況」：放進天氣面板的初始卡片，顯示觀測時間、測站數、最高溫、最低溫、最大雨量、最大風速（含站名）。

### 3. 雷達回波
- 「地圖設定」新增勾選「雷達回波」。
- 取 RainViewer 最新一張，透明度 0.6，`maxNativeZoom: 7`。
- 失敗時取消勾選並顯示提示。

### 4. 底圖切換
- 圖層面板新增「底圖」：**標準**（現有 Voyager + 國土測繪中心）/ **深色**（CARTO dark）。

### 5. 定位我的位置
- 圖層面板底部按鈕「📍 定位我的位置」。
- 成功：放一個藍點並移到 zoom 10。
- 失敗／拒絕：按鈕下方顯示一行原因。

## 不做（YAGNI）
- 溫度內插熱力圖、雷達動畫播放、特報歷史。
- 觀測資料寫入 SQLite。

## 驗證
- `pytest` 全過（原 11 個 + 新增）。
- 本機截圖：桌面 1440×900、手機 390（iframe 方式）。
- 部署到 Vercel 後打 `/api/observations`、`/api/warnings` 確認 200。

## 影響範圍
- 新增：`services/observation.py`、`services/warnings.py`
- 修改：`main.py`、`templates/index.html`、`static/app.js`、`static/style.css`、`tests/test_all.py`、`docs/api.md`
