# API Specification

## 1. Base URL
`http://localhost:8000`

## 2. Endpoints

### 2.1 取得首頁 HTML
- **路徑**: `GET /`
- **說明**: 回傳氣象儀表板 SPA 前端頁面。
- **回應**: `text/html`

### 2.2 取得 22 縣市清單
- **路徑**: `GET /api/cities`
- **說明**: 取得系統支援的 22 個縣市名稱。
- **回應代碼**: 200 OK
- **Response Example**:
```json
{
  "cities": [
    "基隆市", "臺北市", "新北市", "桃園市", "新竹市", "新竹縣", "苗栗縣",
    "臺中市", "彰化縣", "南投縣", "雲林縣", "嘉義市", "嘉義縣", "臺南市",
    "高雄市", "屏東縣", "宜蘭縣", "花蓮縣", "臺東縣", "澎湖縣", "金門縣", "連江縣"
  ]
}
```

### 2.3 取得指定縣市氣象資料
- **路徑**: `GET /api/weather/{city_name}`
- **說明**: 取得指定縣市最新 36 小時預報資料（包含多時段）。
- **回應代碼**: 200 OK / 400 Bad Request / 404 Not Found / 500 Internal Server Error
- **Response Example**:
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
  "updated_at": "2026-09-23 19:00:00"
}
```

### 2.4 取得所有縣市氣象資料
- **路徑**: `GET /api/weather`
- **說明**: 取得全台灣 22 縣市當前最新預報摘要。
- **回應代碼**: 200 OK

## 3. Error Responses
遵照 `spec.md` 規範定義繁體中文錯誤訊息：
- 缺少 API Key: `{"detail": "系統尚未設定 CWA_API_KEY"}` (HTTP 500)
- 縣市不存在: `{"detail": "找不到指定縣市"}` (HTTP 404)
- CWA API 請求失敗: `{"detail": "無法取得氣象資料"}` (HTTP 502)
- SQLite 讀取失敗: `{"detail": "資料庫讀取失敗"}` (HTTP 500)
