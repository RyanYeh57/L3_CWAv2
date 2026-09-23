# Workflow: 00-build.md

## 目的
建立專案運行環境與相依性套件。

## 執行步驟
1. 建立 Python 虛擬環境或確認本機 Python 3.12+。
2. 安裝 `requirements.txt`：`fastapi`, `uvicorn[standard]`, `httpx`, `python-dotenv`。
3. 建立 `.env` 並配置 `CWA_API_KEY`。
4. 驗證環境可用性。
