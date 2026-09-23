# Workflow: 02-design.md

## 目的
完成架構、資料庫與 API 的詳細設計，產出對應設計文檔：
- `docs/architecture.md`
- `docs/database.md`
- `docs/api.md`

## 核心設計原則
- 單一職責原則：資料存取與 API 邏輯分離。
- 快取機制：先查 SQLite，若無資料或過期才向 CWA API 請求並寫入 SQLite。
- 前端零重度依賴：使用純 CSS 實作 Bar Chart，使用純 SVG 實作互動地圖。
