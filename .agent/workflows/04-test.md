# Workflow: 04-test.md

## 目的
針對實作之函式、API 端點與前端互動邏輯執行自動化與端對端測試。

## 測試範圍
1. 後端測試：
   - Database CRUD: 建立表、寫入、查詢、清理。
   - CWA JSON Parser: 正常欄位提取與缺漏值防護。
   - FastAPI 路由: GET /, GET /api/cities, GET /api/weather/{city_name}。
   - 錯誤案例: 不存在的縣市、缺少 API Key、CWA API 錯誤模擬。
2. 前端整合測試：
   - 靜態頁面、SVG 縣市元素包含度 (22 縣市)。
   - Click/Hover 事件邏輯。
