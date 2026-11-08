"""把立法院公報 .doc/.docx 只抽出文字（丟掉圖片），存成正規化的 Markdown。

需要 Windows + Microsoft Word（透過 COM 呼叫 Word 解析檔案；Word 原生解析，最快最準）。

Mac / Linux / 沒有 Word：本腳本無法使用，可改用 LibreOffice 先把 .doc 轉成 UTF-8 純文字，
再自行套用下方的輸出規格（frontmatter + 一段一行）：
    soffice --headless --convert-to "txt:Text (encoded):UTF8" --outdir <輸出資料夾> <資料夾>/*.doc
（LibreOffice 每份需數秒到數十秒，中文大致正確；未在本專案實測。）

用法（在專案根目錄）：
    uv run python .agents/skills/legislative-records/scripts/extract_doc_md.py
    uv run python .agents/skills/legislative-records/scripts/extract_doc_md.py --src <資料夾> --dst <資料夾> [--force]

輸出規格（build_index.py 依賴此格式）：
    ---
    source: "<相對於專案根目錄的原始檔路徑>"
    title: "<檔內第一行標題；續頁無標題則為空字串>"
    date: "YYYY-MM-DD"            # 取自檔名
    file_code: "1156401_00003"    # 取自檔名 LCIDC01_ 之後
    chars: 84077
    ---
    （正文：一段一行、不加任何 Markdown 格式，行號固定）

規則：
    - 增量：.md 比來源新就跳過（--force 全部重轉）
    - *.part（未下載完）略過；*.pdf 不轉換，提示改下載 DOC 版
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[4]
DEFAULT_SRC = PROJECT_ROOT / "output/legislative_communiques/2026_DOC/DOC"
DEFAULT_DST = PROJECT_ROOT / "output/legislative_communiques/2026_MD"

DATE_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})")
CODE_RE = re.compile(r"LCIDC01_(\d+_\d+)")
CTRL_RE = re.compile(r"[\x00-\x08\x0b-\x1f]")


def normalize(text: str) -> str:
    """Word 的 Content.Text → 一段一行的純文字。"""
    text = text.replace("\r\x07", "\n")  # 表格儲存格/列結尾
    text = text.replace("\x07", "\t")
    text = text.replace("\x0b", "\n")  # 手動換行 (Shift+Enter)
    text = text.replace("\x0c", "\n")  # 分頁/分節符號
    text = text.replace("\r", "\n")  # 段落結尾
    text = CTRL_RE.sub("", text)  # 欄位碼標記、內嵌物件佔位符等
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip() + "\n"


def find_title(body: str) -> str:
    for line in body.split("\n")[:3]:
        if line.startswith("立法院"):
            return line.strip()
    return ""


def is_mostly_images(body: str, images: int) -> bool:
    """預算審查等章節常以一頁一張掃描圖片收錄，Word 內沒有文字（需 OCR）。"""
    return images >= 10 and len(body) < images * 50


def frontmatter(src: Path, body: str, images: int) -> str:
    try:
        rel = src.relative_to(PROJECT_ROOT).as_posix()
    except ValueError:
        rel = str(src)
    date = DATE_RE.match(src.name)
    code = CODE_RE.search(src.name)
    fields = {
        "source": rel,
        "title": find_title(body),
        "date": date.group(1) if date else "",
        "file_code": code.group(1) if code else "",
    }
    lines = [f"{k}: {json.dumps(v, ensure_ascii=False)}" for k, v in fields.items()]
    lines.append(f"chars: {len(body)}")
    lines.append(f"images: {images}")
    lines.append(f"mostly_images: {'true' if is_mostly_images(body, images) else 'false'}")
    return "---\n" + "\n".join(lines) + "\n---\n"


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--src", type=Path, default=DEFAULT_SRC)
    ap.add_argument("--dst", type=Path, default=DEFAULT_DST)
    ap.add_argument("--force", action="store_true", help="全部重新轉換")
    args = ap.parse_args()

    src_dir: Path = args.src.resolve()
    dst_dir: Path = args.dst.resolve()
    dst_dir.mkdir(parents=True, exist_ok=True)

    files = sorted(p for p in src_dir.iterdir() if p.is_file())
    parts = [p for p in files if p.suffix.lower() == ".part"]
    pdfs = [p for p in files if p.suffix.lower() == ".pdf"]
    docs = [p for p in files if p.suffix.lower() in (".doc", ".docx")]

    if parts:
        print("略過未下載完的檔案：\n  " + "\n  ".join(p.name for p in parts))
    if pdfs:
        print(
            "不支援 PDF（雙欄排版轉文字易錯亂），請到立法院公報系統改下載同一份紀錄的 DOC 版：\n  "
            + "\n  ".join(p.name for p in pdfs)
        )

    todo = []
    for p in docs:
        out = dst_dir / (p.stem + ".md")
        if args.force or not out.exists() or out.stat().st_mtime < p.stat().st_mtime:
            todo.append((p, out))
    if not todo:
        print(f"沒有需要轉換的檔案（共 {len(docs)} 份已是最新）。")
        return 0

    try:
        import pythoncom
        import win32com.client

        pythoncom.CoInitialize()
        word = win32com.client.DispatchEx("Word.Application")  # 獨立的 Word 程序，不干擾使用者開著的 Word
    except Exception as e:  # noqa: BLE001 — 非 Windows（無 pywin32）或未安裝 Word
        print(
            f"無法啟動 Microsoft Word（{e}）。\n"
            "本腳本需要 Windows + Word。Mac / Linux 請改用 LibreOffice，見本檔開頭說明：\n"
            '  soffice --headless --convert-to "txt:Text (encoded):UTF8" --outdir <輸出資料夾> <資料夾>/*.doc'
        )
        return 2
    word.Visible = False
    word.DisplayAlerts = 0
    failed = []
    image_only = []
    t_all = time.perf_counter()
    try:
        for i, (src, out) in enumerate(todo, 1):
            mb = src.stat().st_size / 2**20
            print(f"[{i}/{len(todo)}] {src.name} ({mb:,.1f} MB)", flush=True)
            t0 = time.perf_counter()
            doc = None
            try:
                doc = word.Documents.Open(
                    FileName=str(src),
                    ConfirmConversions=False,
                    ReadOnly=True,
                    AddToRecentFiles=False,
                    Visible=False,
                )
                body = normalize(doc.Content.Text)  # 一次取整份文字；勿逐段走訪（每段一次跨程序呼叫，極慢）
                images = doc.InlineShapes.Count
                out.write_text(frontmatter(src, body, images) + body, encoding="utf-8", newline="\n")
                print(f"    -> {len(body):,} 字，{images} 張圖，{time.perf_counter() - t0:.1f} 秒", flush=True)
                if is_mostly_images(body, images):
                    image_only.append(src.name)
                    print("    ⚠ 主要為圖片掃描頁，Word 內幾乎無文字（需 OCR 才能取得內容）", flush=True)
            except Exception as e:  # noqa: BLE001 — 單檔失敗不影響其他檔案
                failed.append(src.name)
                print(f"    失敗：{e}", flush=True)
            finally:
                if doc is not None:
                    doc.Close(SaveChanges=0)
    finally:
        word.Quit()
        pythoncom.CoUninitialize()

    print(f"\n完成 {len(todo) - len(failed)}/{len(todo)} 份，共 {time.perf_counter() - t_all:.0f} 秒，輸出：{dst_dir}")
    if image_only:
        print("主要為圖片（無文字，需 OCR）：\n  " + "\n  ".join(image_only))
    if failed:
        print("失敗：\n  " + "\n  ".join(failed))
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
