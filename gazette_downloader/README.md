# gazette_downloader — 立法院教文委員會公報 DOC 下載

從官方議事暨公報資訊網下載教育及文化委員會的公報紀錄 DOC 原檔。
下載完成後交給 `legislative-records` skill 轉 md、建索引。

## 目錄

| 路徑 | 內容 |
|---|---|
| `download_2026_docs.py` | 主程式：查核會議頁 → 找出公報 DOC 連結 → 下載 → 寫清單紀錄與 zip |
| `finalize_2026_docs.py` | 收尾：只重試缺漏的檔案、驗證 Word 格式與檔案大小、清除 `.part`、重寫紀錄與 zip |
| `prefetch_doc_tail.py` | 輔助：從佇列尾端另開下載，加快大量下載（可選） |
| `records/` | 下載紀錄：`meetings.json`（會議清單）、`files.json`（下載結果與 SHA-256）、`summary.json`、`ivod_dates.json`、`index.html`（可在瀏覽器開啟的清單）；執行 `prefetch_doc_tail.py` 會另產生 `prefetched_files.json`，下載失敗時 finalize 會產生 `remaining_failures.json` |
| `records/seed/` | 種子資料：官方 API 回傳的會議清單 `api_1.json`、`api_page2.json`（主程式必讀）等 |
| `records/sittings/` | 各場會議頁 HTML 快取；已存在的會議頁不會重新抓取 |

下載的 DOC 放在資料目錄 `output/legislative_communiques/2026_DOC/DOC/`（不在本目錄）。

## 執行（在專案根目錄）

```
uv run python gazette_downloader/download_2026_docs.py
uv run python gazette_downloader/finalize_2026_docs.py
```

接著更新查詢資料：

```
uv run python .agents/skills/legislative-records/scripts/extract_doc_md.py
uv run python .agents/skills/legislative-records/scripts/build_index.py
```

## 要抓新會議前必須更新（目前寫死在程式內）

- `download_2026_docs.py` 的 `TODAY`（查核日，晚於此日的會議視為「未來會議預告」而不下載）
- `IVOD_DATES`（IVOD 列出的 2026 年會議日期）
- `records/seed/api_1.json`、`api_page2.json`（官方 API 的會議清單；新會議不在清單內就不會被下載）

## 注意

- 需要 Windows（呼叫 `C:/Windows/System32/curl.exe`）。
- 每次寫紀錄都會重新打包 `output/legislative_communiques/2026_教文委員會_公報DOC.zip`（約 3 GB，耗時）；不需要 zip 時可刪除該檔。
- `records/index.html` 的「本機 DOC」連結以相對路徑指向 `output/.../2026_DOC/DOC/`，在 zip 內開啟時連結會失效。
