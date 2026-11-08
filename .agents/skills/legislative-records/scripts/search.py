"""搜尋公報紀錄全文，並標出每個命中是「誰、在哪一段發言裡」說的。只用標準庫。

用法（在專案根目錄；需先執行 build_index.py）：
    python .agents/skills/legislative-records/scripts/search.py 關鍵字 [關鍵字…] [選項]
    python .agents/skills/legislative-records/scripts/search.py --show 1156401_00003:296-361

選項：
    --any            任一關鍵字即命中（預設：同一段落行內須包含全部關鍵字）
    --speaker 姓名    只看該人說的話（例：吳思瑤、鄭英耀、主席）
    --owner 姓名      只看該委員主導的段落（含官員對他的答覆）
    --date 前綴       日期前綴，例：2026-07、2026-08-19
    --kind 類別       全體 / 聯席 / 公聽會
    --limit N        最多顯示幾個命中（預設 40）
    --per-seg N      每個段落最多顯示幾個命中（預設 3）
    --show 代碼:起-迄  直接印出該檔指定行號範圍（含行號），例：1156401_00003:296-361
"""

from __future__ import annotations

import argparse
import bisect
import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[4]
INDEX = PROJECT_ROOT / "output/legislative_communiques/2026_INDEX/segments.json"
WIDTH = 45  # 命中處前後各顯示多少字


def load() -> list[dict]:
    if not INDEX.exists():
        sys.exit(f"找不到索引 {INDEX}，請先執行 build_index.py")
    return json.loads(INDEX.read_text(encoding="utf-8"))


def read_lines(mt: dict) -> list[str]:
    return (PROJECT_ROOT / mt["file"]).read_text(encoding="utf-8").split("\n")


def show(meetings: list[dict], spec: str) -> int:
    code, _, rng = spec.partition(":")
    mt = next((m for m in meetings if m["code"] == code), None)
    if mt is None:
        print(f"找不到代碼 {code}")
        return 1
    lines = read_lines(mt)
    a, _, b = rng.removeprefix("L").partition("-")
    start = int(a) if a else 1
    end = int(b.removeprefix("L")) if b else min(start + 40, len(lines))
    print(f"== {mt['date']} {mt['label']} [{code}] {mt['file']}")
    for n in range(start, min(end, len(lines)) + 1):
        print(f"{n}\t{lines[n - 1]}")
    return 0


def snippet(line: str, terms: list[str]) -> str:
    pos = min((line.find(t) for t in terms if t in line), default=0)
    a, b = max(0, pos - WIDTH), min(len(line), pos + WIDTH)
    s = ("…" if a else "") + line[a:b] + ("…" if b < len(line) else "")
    for t in terms:
        s = s.replace(t, f"【{t}】")
    return s


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("terms", nargs="*")
    ap.add_argument("--any", action="store_true")
    ap.add_argument("--speaker")
    ap.add_argument("--owner")
    ap.add_argument("--date", default="")
    ap.add_argument("--kind")
    ap.add_argument("--limit", type=int, default=40)
    ap.add_argument("--per-seg", type=int, default=3)
    ap.add_argument("--show")
    args = ap.parse_args()

    meetings = load()
    if args.show:
        return show(meetings, args.show)
    if not args.terms and not (args.speaker or args.owner):
        ap.error("請給關鍵字，或至少指定 --speaker / --owner")

    match = any if args.any else all
    shown = total = 0
    hit_meetings = set()
    for mt in sorted(meetings, key=lambda m: (m["date"], m["code"])):
        if not mt["date"].startswith(args.date) or (args.kind and mt["kind"] != args.kind):
            continue
        utts = mt["utterances"]  # [start, end, name, role, title]
        u_starts = [u[0] for u in utts]
        segs = mt["segments"]
        s_starts = [s["start"] for s in segs]
        lines = read_lines(mt)
        header_done = False
        seg_count: dict[int, int] = {}
        for n, line in enumerate(lines, 1):
            if args.terms and not match(t in line for t in args.terms):
                continue
            ui = bisect.bisect_right(u_starts, n) - 1
            u = utts[ui] if ui >= 0 and n <= utts[ui][1] else None
            si = bisect.bisect_right(s_starts, n) - 1
            s = segs[si] if si >= 0 and n <= segs[si]["end"] else None
            speaker = u[2] if u else ""
            if args.speaker and args.speaker not in speaker:
                continue
            if args.owner and not (s and args.owner in s["owner"]):
                continue
            total += 1
            hit_meetings.add(mt["code"])
            if shown >= args.limit:
                continue
            if seg_count.get(si, 0) >= args.per_seg:
                continue
            if not header_done:
                note = "（主要為圖片，未含文字）" if mt.get("mostly_images") else ""
                print(f"\n== {mt['date']} {mt['label']} [{mt['code']}]{note}\n   {mt['file']}")
                header_done = True
            if si not in seg_count:
                if s:
                    resp = f"（答詢：{'、'.join(s['responders'])}）" if s["responders"] else ""
                    print(f"  ▸ {s['kind']}段落 {s['owner']} L{s['start']}-L{s['end']}{resp}")
                else:
                    print("  ▸ （段落外：表頭、議程、議事錄或附件）")
                seg_count[si] = 0
            seg_count[si] += 1
            shown += 1
            who = f"{speaker}（{u[4]}）" if u and u[4] else (speaker or "—")
            if u and n == u[0]:  # 發言第一行：去掉原文的「郭委員昱晴：」標籤，前面已顯示發言者
                line = line.partition("：")[2]
            text = snippet(line, args.terms) if args.terms else line[: WIDTH * 2]
            print(f"    L{n} {who}：{text}")

    print(f"\n共 {total} 個命中，分布在 {len(hit_meetings)} 份檔案；顯示 {shown} 個。", end="")
    if total > shown:
        print("（已截斷：加 --date / --speaker / --owner 縮小範圍，或調大 --limit / --per-seg）")
    else:
        print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
