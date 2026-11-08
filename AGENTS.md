# Agent Rules

## Env & Tools

- Python 3.14+（見 `pyproject.toml`），一律使用 `uv` 管理專案與虛擬環境（路徑為 `.venv`）。
- 安裝套件一律使用 `uv add`，執行腳本一律使用 `uv run`（禁止直接使用 `pip` 或 `python`）。
- `.doc` 轉 md（`extract_doc_md.py`）需要 Windows + Microsoft Word；建索引與搜尋只用標準庫。

## 專案結構

- 查詢 skill：`.agents/skills/legislative-records/`（`SKILL.md` + `scripts/`）。`.claude/skills/legislative-records` 是本機連結，不要另存一份。
- 公報下載：`gazette_downloader/`（下載紀錄在 `records/`，用法見其 `README.md`）。
- 資料：`output/legislative_communiques/`
  - `2026_DOC/DOC/`：原始 .doc（不進版控）
  - `2026_MD/`：轉換後的 md
  - `2026_INDEX/`：索引

## 資料規則

- `2026_MD/`、`2026_INDEX/` 由腳本產生，禁止手動編輯；修改轉換或索引邏輯後，重跑 `extract_doc_md.py --force` 或 `build_index.py`。
- md 一律 LF、一段一行：索引與回答引用都依賴固定的行號。
- 只收 .doc / .docx；PDF 請改下載同一份紀錄的 DOC 版。
- 原始 .doc、zip 不進版控（見 `.gitignore`）。

## Security

- 禁止 hardcode 金鑰或密碼；禁止 Agent 讀取或檢視 `.env`、`*.key` 等機密檔案內容；禁止在 log / print / 報錯中印出機密。

## Code & Behavior

- 需加上 Type Hints 與 `try...except` 錯誤處理。
- 僅修改指定功能，直接給出最小可執行代碼；註解與說明一律使用繁體中文。
