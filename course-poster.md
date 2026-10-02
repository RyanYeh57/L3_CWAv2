# AI 創新微課程：Taiwan Weather Forecast

> 從氣象資料到互動式天氣預報應用
> 用程式探索天氣・用資料看見台灣・用 AI 實現更多可能

**技術：** CWA API × JSON × Python × SQLite × Streamlit

*Code Smarter, Build a Better Tomorrow!*

---

## 課程總覽

| # | 單元 | 副標題 | 重點 |
|---|---|---|---|
| 1 | 課程介紹 | AI × 資料 × 天氣 × 實作 | 課程目標、學習地圖、專案成果展示 |
| 2 | 台灣的天氣與生活 | 氣象的重要性 | 天氣影響生活、資料驅動決策、智慧應用案例 |
| 3 | 中央氣象署 CWA | Open Data 平台 | 註冊帳號、取得 API Key、選擇資料集 |
| 4 | API 資料取得 | 使用 Requests 取得 JSON | `requests.get()` |
| 5 | JSON 資料結構解析 | 找到氣溫資料的位置 | `locations` → `weatherElement` |
| 6 | 提取最高與最低氣溫 | 資料分析與處理 | 解析 JSON、提取 MinT / MaxT、轉換成結構化資料 |
| 7 | 資料整理與預覽 | 使用 Pandas 觀察資料 | DataFrame 預覽 |
| 8 | 建立 SQLite 資料庫 | 儲存氣溫資料 | 建立資料庫、創建資料表、插入氣溫資料（`data.db`） |
| 9 | 資料庫設計 | TemperatureForecasts | 資料表結構 |
| 10 | 查詢資料驗證 | 使用 SQL 檢查資料 | `SELECT` 查詢 |
| 11 | Streamlit 入門 | 快速建立 Web App | 安裝環境、基本結構、Hello World |
| 12 | 從資料庫讀取資料 | 使用 SQL 查詢 | `pd.read_sql_query()` |
| 13 | 下拉選單選擇地區 | 互動式操作 | Select Region |
| 14 | 繪製折線圖 | 一週最高與最低氣溫 | MaxT / MinT 折線圖 |
| 15 | 顯示資料表格 | 清楚呈現一週資料 | Date / MinT / MaxT 表格 |
| 16 | 整合 Web App 介面 | 選地區看氣溫預報 | 下拉選單 + 折線圖 + 表格 |
| 17 | 進階：台灣地圖視覺化 | 使用 Folium + Streamlit | 依平均溫度上色 |
| 18 | 選擇日期顯示地圖 | 互動式天氣地圖 | Select Date |
| 19 | 完整成果展示 | Taiwan Weather Dashboard | 地圖 + 資料表 |
| 20 | 程式碼品質與優化 | 更好的程式設計 | 程式結構清晰、錯誤處理機制、重複執行不重複插入、良好的註解 |
| 21 | 專案上傳至 GitHub | 版本管理與備份 | 建立 Repository、連結 Git (remote)、Commit & Push |
| 22 | 延伸應用與想法 | 從天氣系統到更多可能 | 天氣提醒 Line Bot、旅遊行程建議、農業／防災應用、結合 AI 做分析 |
| 23 | 回顧與重點整理 | 你學到了什麼？ | API 資料取得、JSON 資料分析、SQLite 資料庫、Streamlit Web App、AI × Coding 實作流程 |
| 24 | 下一步：繼續探索 | AI × Data × Real World | 更多公開資料 API、資料視覺化應用、AI 輔助開發、打造自己的專案作品 |

---

## 單元細節

### 4. API 資料取得

```python
import requests
url = 'https://...'
headers = {'Authorization': '...'}
resp = requests.get(url)
data = resp.json()
```

### 5. JSON 資料結構解析

```json
{
  "locations": [
    { "locationName": "中部地區",
      "weatherElement": [
        { "elementName": "MinT" },
        { "elementName": "MaxT" }
      ]
    }
  ]
}
```

### 7. 資料整理與預覽（Pandas）

| regionName | dataDate | mint | maxt |
|---|---|---|---|
| 北部地區 | 2026-04-14 | 18 | 26 |
| 中部地區 | 2026-04-14 | 20 | 30 |
| 南部地區 | 2026-04-14 | 22 | 31 |

### 9. 資料庫設計：TemperatureForecasts

| 欄位 | 型別 |
|---|---|
| `id` | `INTEGER PRIMARY KEY` |
| `regionName` | `TEXT` |
| `dataDate` | `TEXT` |
| `mint` | `REAL` |
| `maxt` | `REAL` |

### 10. 查詢資料驗證

```sql
SELECT DISTINCT regionName
FROM TemperatureForecasts;

SELECT *
FROM TemperatureForecasts
WHERE regionName = '中部地區';
```

### 12. 從資料庫讀取資料

```python
import sqlite3
conn = sqlite3.connect('data.db')
df = pd.read_sql_query(
    'SELECT * FROM TemperatureForecasts'
    ' ...', conn)
```

### 13. 下拉選單選擇地區

選項：北部地區、南部地區、東北部地區、東部地區、東南部地區（以及中部地區）

### 14. 繪製折線圖

- 一週（04/14 ~ 04/20）最高溫 MaxT 與最低溫 MinT 兩條線
- Y 軸範圍約 10 ~ 40 °C

### 15. 顯示資料表格

| Date | MinT | MaxT |
|---|---|---|
| 2026-04-14 | 20 | 30 |
| 2026-04-15 | 21 | 31 |
| 2026-04-16 | 22 | 32 |
| 2026-04-17 | 21 | 30 |

### 17. 台灣地圖視覺化：平均溫度顏色

| 平均溫度 | 顏色 |
|---|---|
| < 20°C | 🔵 藍 |
| 20 – 25°C | 🟢 綠 |
| 25 – 30°C | 🟠 橘 |
| > 30°C | 🔴 紅 |

地圖標示地區：北部、東北部、中部、東部、南部、東南部

### 18. 選擇日期顯示地圖

- 日期選單：`2026-04-14`
- 點地區顯示彈出視窗，例如：中部地區 Min: 20°C / Max: 30°C

### 19. 完整成果展示

- 左：台灣地圖（彩色圓點）
- 右：Temperature Data 表格（`city`、`start_time`）

---

## 講師：煥哥

> 「技術可以解決問題，但更重要的是用技術創造更好的未來！」— 煥哥

- 與你一起用 AI 寫程式，探索更大的世界！
- *Learn Today, Build Tomorrow*
- *AI for Learning, AI for a Better Taiwan*
