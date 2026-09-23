# Taiwan Weather Forecast 台灣縣市氣象 Dashboard

> **AI Agent × SDD × CWA API × SQLite × Interactive SVG Map**  
> 基於交通部中央氣象署 (CWA) OpenData API、FastAPI、SQLite 與互動式向量台灣地圖開發的現代氣象預報儀表板。

---

## 專案特色

- **純前端互動地圖**：內建 22 縣市獨立 SVG 向量路徑（含外島：澎湖、金門、馬祖），支援 Hover 高亮、Click 選取與流暢動畫，無需依賴第三方地圖金鑰。
- **快取機制與效能**：整合 SQLite 本機資料庫（`database/weather.db`），自動快取預報資料，減少重複外部請求，保證低延遲響應。
- **動態條狀圖 (Bar Chart)**：採用純 CSS Flexbox 與動態百分比換算，即時渲染最高溫、最低溫與降雨機率，支援多時段（06:00~18:00、18:00~06:00 等）預報卡片展示。
- **健全錯誤處理與防護**：全方位處理無效縣市、未配置 API Key、網路異常或資料庫錯誤，並提供標準繁體中文錯誤提示。
- **現代美學與 RWD 佈局**：採用深色玻璃擬態風格（Glassmorphism），桌面端呈現雙欄地圖與儀表板，行動端自動切換為垂直堆疊卡片。

---

## 技術棧

| 領域 | 技術 / 工具 |
|---|---|
| **後端核心** | Python 3.12+ / FastAPI / Uvicorn / httpx |
| **資料庫** | SQLite 3 (`sqlite3`) |
| **環境管理** | python-dotenv |
| **前端設計** | HTML5 / Vanilla CSS3 / JavaScript (ES6+) |
| **地圖視覺化** | 互動式 SVG (22 縣市路徑與外島區塊) |
| **測試框架** | pytest / TestClient |

---

## 專案結構

```text
d:\hw2 CWA\
├── main.py                     # FastAPI 應用程式主入口與靜態檔案掛載
├── services/
│   ├── weather.py              # CWA API 呼叫、JSON 解析轉換與快取協調
│   └── database.py             # SQLite 資料庫 CRUD 操作與 Schema 管理
├── data/
│   └── cities.py               # 台灣 22 縣市常數與 SVG ID 映射表
├── database/
│   └── weather.db              # SQLite 資料庫快取檔案 (.gitignore 排除)
├── templates/
│   └── index.html              # 前端主頁面 HTML
├── static/
│   ├── style.css               # 樣式表 (Glassmorphism & RWD)
│   ├── app.js                  # 前端互動邏輯、API 請求與長條圖計算
│   └── taiwan-map.svg          # 台灣 22 縣市高解析向量地圖
├── tests/
│   └── test_all.py             # 全模組自動化單元與整合測試
├── docs/                       # 架構、資料庫與 API 規格文檔
├── .agent/                     # Agent 開發與驗收工作流程 (Workflows)
├── .env.example                # 環境變數設定範例檔
├── .gitignore                  # Git 排除清單 (.env, *.db 等)
├── requirements.txt            # Python 相依套件清單
├── spec.md                     # 規格說明書
├── plan.md                     # 實作計畫書
├── verify.md                   # 驗證規範
├── verification-report.md      # 驗收標準檢驗報告
└── README.md                   # 本說明文件
```

---

## 快速開始

### 1. 安裝環境依賴

建議使用 Python 3.12+ 環境，執行以下指令安裝所需套件：

```bash
pip install -r requirements.txt
```

### 2. 配置環境變數

複製 `.env.example` 為 `.env`，並填入中央氣象署 CWA OpenData 授權碼：

```bash
cp .env.example .env
```

編輯 `.env` 內容：

```ini
CWA_API_KEY=你的_CWA_API_授權碼
```
> 若無 API Key，系統在快取中若有預報仍可正常展示，若無快取則會回傳標準提示「系統尚未設定 CWA_API_KEY」。

### 3. 啟動服務

執行以下指令啟動 FastAPI 本機伺服器：

```bash
python main.py
```
或使用 uvicorn 指令：
```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

開啟瀏覽器造訪：`http://127.0.0.1:8000`

---

## API 端點規格

| 方法 | 端點路徑 | 說明 |
|---|---|---|
| `GET` | `/` | 回傳前端氣象儀表板 SPA 首頁 |
| `GET` | `/api/cities` | 取得台灣標準 22 縣市清單 |
| `GET` | `/api/weather` | 取得全台縣市預報摘要 |
| `GET` | `/api/weather/{city_name}` | 取得指定縣市最新時段預報與氣溫指標 |

---

## 自動化測試

執行 pytest 執行全套件測試（包含資料庫 CRUD、CWA JSON 解析器、FastAPI 端點與前端資產完整性）：

```bash
python -m pytest tests/test_all.py -v
```

---

## 驗收標準對照

本專案經過嚴格依照 `spec.md` 與 `verify.md` 進行逐項檢驗（參閱 `verification-report.md`）：
- 22 個縣市點擊與選取功能完整正常。
- 首頁載入不立即耗用所有縣市 API，點擊後依需求按需載入。
- 動態計算長條圖，支援多時間區間展開。
- `.env` 確實被 `.gitignore` 排除，絕無洩漏至 Git 追蹤。
