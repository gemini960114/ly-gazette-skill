"""從正規化 md（extract_doc_md.py 的輸出）建立公報紀錄索引。只用標準庫。

用法（在專案根目錄）：
    uv run python .agents/skills/legislative-records/scripts/build_index.py [--src <md資料夾>] [--out <索引資料夾>]

輸出（預設 output/legislative_communiques/2026_INDEX/，每次全部重建）：
    meetings.md               所有檔案／會議一覽
    meetings/<代碼>.md         單場明細：議程、答詢官員、發言段落表、決議
    legislators.md            委員一覽（段落數、出席會議）
    legislators/<姓名>.md      單一委員的所有發言段落
    speakers.md               官員／學者專家一覽與發言位置
    segments.json             機器可讀版，search.py 使用

行號一律是 md 檔的實際行號（含 frontmatter），可直接 Read offset 使用。
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass, field
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[4]
DEFAULT_SRC = PROJECT_ROOT / "output/legislative_communiques/2026_MD"
DEFAULT_OUT = PROJECT_ROOT / "output/legislative_communiques/2026_INDEX"

CJK = r"一-鿿㐀-䶿"
LABEL_RE = re.compile(r"^([^：:，。、（）()「」\s]{2,24})：(.*)$")
TIME_RE = re.compile(r"^（(\d{1,2}時\d{1,2}分)）")

# 委員：姓(1-2字)+委員+名，例：郭委員昱晴、高金委員素梅、伍委員麗華Saidhai．Tahovecahe
LEGISLATOR_RE = re.compile(rf"^([{CJK}]{{1,2}})委員([{CJK}]{{1,3}})([^{CJK}].*)?$")
# 書面：委員林宜瑾書面質詢、李委員柏毅書面質詢、教育部書面資料、理事長王瀚陽書面資料
WRITTEN_LEG_RE = re.compile(rf"^(?:委員([{CJK}]{{2,4}})|([{CJK}]{{1,2}})委員([{CJK}]{{1,3}}))書面(質詢|資料)\d*$")
WRITTEN_DOC_RE = re.compile(r"^(.{2,20}?)書面資料\d*$")
# 官員／專家：姓+修飾+職稱+名，例：張廖次長萬堅、王代理副司長浩祿、丁常務理事志仁
TITLES = sorted(
    """主任委員 專門委員 執行秘書 主任秘書 秘書長 總召集人 召集人 執行長 總經理 董事長 理事長 總會長 會長
    創辦人 研究員 總工程師 工程師 工程司 技正 教授 部長 次長 署長 司長 院長 局長 處長 組長 所長 主任 校長
    館長 廳長 參事 監事 理事 科長 秘書 律師 委員長 執行秘書""".split(),
    key=len,
    reverse=True,
)
MODS = r"(?:副|代理|代|常務|候任|輔導|簡任|專業總|專業|正|助理|政務|主任兼|兼)*"
OFFICIAL_RE = re.compile(rf"^([{CJK}]{{1,2}}?)({MODS}(?:{'|'.join(TITLES)}))([{CJK}]{{1,3}})$")

REPORT_OPENING_RE = re.compile(r"^主席、各位委員")  # 官員專題報告的固定開場

# 原文錯字 → 正確姓名（發現新的就加在這裡）
ALIASES = {"吳憶沛": "吳沛憶"}

GREETING_RE = re.compile(
    r"^(?:（\d+時\d+分）)?(?:\s|謝謝主席|謝謝|主席|好|各位[^，。！]{0,12}|有請[^，。！]{0,20}|請[^，。！]{0,10}備詢[^，。！]{0,6}|早安|午安|你好|您好|部長|次長|[，、。！!：])*"
)


@dataclass
class Speaker:
    name: str  # 正規化姓名：郭昱晴、李遠；主席為「主席」
    role: str  # 主席 / 委員 / 官員 / 書面質詢 / 書面資料
    title: str = ""  # 官員職稱（部長、代理副司長…）


def parse_label(label: str) -> Speaker | None:
    sp = _parse_label(label)
    if sp is not None:
        sp.name = ALIASES.get(sp.name, sp.name)
    return sp


def _parse_label(label: str) -> Speaker | None:
    if label == "主席":
        return Speaker("主席", "主席")
    m = WRITTEN_LEG_RE.match(label)
    if m:
        name = m.group(1) or (m.group(2) + m.group(3))
        return Speaker(name, "書面質詢" if m.group(4) == "質詢" else "書面資料")
    m = LEGISLATOR_RE.match(label)
    if m:
        return Speaker(m.group(1) + m.group(2), "委員")
    m = OFFICIAL_RE.match(label)
    if m:
        return Speaker(m.group(1) + m.group(3), "官員", m.group(2))
    m = WRITTEN_DOC_RE.match(label)
    if m:
        return Speaker(m.group(1), "書面資料")
    return None


@dataclass
class Utterance:
    start: int  # 1-based 檔案行號
    end: int
    name: str
    role: str
    title: str
    time: str = ""
    chars: int = 0


@dataclass
class Segment:
    start: int
    end: int
    owner: str
    kind: str  # 委員 / 書面質詢 / 書面資料 / 報告 / 發言（公聽會）
    time: str = ""
    chars: int = 0
    responders: list[str] = field(default_factory=list)
    excerpt: str = ""


@dataclass
class Meeting:
    code: str
    file: str  # 相對專案根目錄
    date: str
    title: str
    label: str
    kind: str  # 全體 / 聯席 / 公聽會 / 其他
    continuation_of: str = ""
    chars: int = 0
    images: int = 0
    mostly_images: bool = False
    time: str = ""
    place: str = ""
    chair: str = ""
    agenda: list[str] = field(default_factory=list)
    attendees: list[str] = field(default_factory=list)
    decisions: list[tuple[int, str]] = field(default_factory=list)
    utterances: list[Utterance] = field(default_factory=list)
    segments: list[Segment] = field(default_factory=list)


def read_md(path: Path) -> tuple[dict, list[str], int]:
    """回傳 (frontmatter, 全部行, 正文第一行的 0-based index)。"""
    lines = path.read_text(encoding="utf-8").split("\n")
    meta: dict = {}
    body_start = 0
    if lines and lines[0] == "---":
        end = lines.index("---", 1)
        for raw in lines[1:end]:
            k, _, v = raw.partition(": ")
            try:
                meta[k] = json.loads(v)
            except json.JSONDecodeError:
                meta[k] = v
        body_start = end + 1
    return meta, lines, body_start


def meeting_label(title: str) -> tuple[str, str]:
    if m := re.search(r"第(\d+)次全體委員會議", title):
        return f"全體第{m.group(1)}次", "全體"
    if m := re.search(r"會期(.+?)委員會第(\d+)次聯席會議", title):
        return f"聯席第{m.group(2)}次（{m.group(1)}）", "聯席"
    if "公聽會" in title:
        m = re.search(r"「(.+?)」", title)
        return (f"公聽會「{m.group(1)}」" if m else "公聽會"), "公聽會"
    return title or "（無標題）", "其他"


def clean_name(s: str) -> str:
    """表頭的主席欄：羅委員廷瑋 / 伍麗華Saidhai Tahovecahe委員 / 羅召集委員廷瑋 → 姓名。"""
    s = s.strip(" 　：")
    if m := re.match(rf"^([{CJK}]{{1,2}})(?:召集)?委員([{CJK}]{{1,3}})", s):
        return m.group(1) + m.group(2)
    if m := re.match(rf"^([{CJK}]{{2,4}}).*委員$", s):
        return m.group(1)
    return s


def parse_header(mt: Meeting, lines: list[str], body_start: int) -> None:
    field_names = {"時": "time", "地": "place", "主": "chair"}
    section = ""
    for line in lines[body_start : body_start + 80]:
        if line.startswith("主席："):
            break
        m = re.match(r"^([時地主議])[　 ]+[間點席程][　 ：]*(.*)$", line)
        if m:
            key = m.group(1)
            if key == "議":
                section = "agenda"
                if m.group(2):
                    mt.agenda.append(m.group(2))
            else:
                section = ""
                val = m.group(2).strip()
                setattr(mt, field_names[key], clean_name(val) if key == "主" else val)
            continue
        if line.startswith("答詢官員") or line.startswith("發言學者專家"):
            section = "attendees"
            rest = re.sub(r"^(答詢官員|發言學者專家及機關團體代表|發言學者專家)[　 ：]*", "", line)
            if rest:
                mt.attendees.append(rest)
            continue
        if line.startswith(("繼續開會", "立法院第")) or not line.strip():
            section = "" if line.startswith(("繼續開會", "立法院第")) else section
            continue
        if section == "agenda":
            mt.agenda.append(line.strip())
        elif section == "attendees":
            mt.attendees.append(line.strip())


def parse_utterances(lines: list[str], body_start: int) -> list[Utterance]:
    utts: list[Utterance] = []
    for i in range(body_start, len(lines)):
        m = LABEL_RE.match(lines[i])
        if not m:
            continue
        sp = parse_label(m.group(1))
        if sp is None:
            continue
        t = TIME_RE.match(m.group(2))
        utts.append(Utterance(i + 1, 0, sp.name, sp.role, sp.title, t.group(1) if t else ""))
    for k, u in enumerate(utts):
        nxt = utts[k + 1].start - 1 if k + 1 < len(utts) else len(lines)
        while nxt > u.start and not lines[nxt - 1].strip():
            nxt -= 1
        u.end = nxt
        u.chars = sum(len(lines[j]) for j in range(u.start - 1, u.end))
    return utts


def minutes_regions(lines: list[str], utts: list[Utterance]) -> list[tuple[int, int]]:
    """主席宣讀「上次會議議事錄」之後到下一次主席發言之間，是上一場的議事錄。"""
    regions = []
    chair = [u for u in utts if u.role == "主席"]
    for k, u in enumerate(chair):
        if "議事錄" in lines[u.start - 1] and "宣讀" in lines[u.start - 1]:
            end = chair[k + 1].start - 1 if k + 1 < len(chair) else u.end
            regions.append((u.start, end))
    return regions


def excerpt_of(lines: list[str], utts: list[Utterance], owner: str) -> str:
    text = ""
    for u in utts:
        if u.name != owner:
            continue
        first = LABEL_RE.match(lines[u.start - 1])
        body = (first.group(2) if first else "") + "".join(lines[u.start : u.end])
        body = GREETING_RE.sub("", body).strip()
        if len(body) >= 15:
            text = body
            break
    text = re.sub(r"\s+", " ", text)
    return text[:90] + ("…" if len(text) > 90 else "")


def build_segments(mt: Meeting, lines: list[str]) -> None:
    utts = mt.utterances
    hearing = mt.kind == "公聽會"
    seg_utts: list[list[Utterance]] = []
    owners: list[tuple[str, str]] = []
    cur: tuple[str, str] | None = None
    seen_legislator = False
    for u in utts:
        if u.role in ("書面質詢", "書面資料"):
            key = (u.name, u.role)
        elif hearing and u.role != "主席":
            key = (u.name, "發言")
        elif u.role == "委員":
            key = (u.name, "委員")
            seen_legislator = True
        elif u.role == "官員" and not hearing and (
            not seen_legislator or REPORT_OPENING_RE.match(lines[u.start - 1].partition("：")[2])
        ):
            key = (u.name, "報告")  # 詢答前的報告，或中途另一議題的專題報告
        else:
            key = None  # 主席、答詢官員 → 併入目前段落
        if key is not None and key != cur:
            cur = key
            owners.append(key)
            seg_utts.append([])
        if seg_utts:
            seg_utts[-1].append(u)
    for (owner, kind), group in zip(owners, seg_utts):
        start = group[0].start
        end = group[-1].end
        resp = Counter(
            f"{u.name}（{u.title}）" for u in group if u.role == "官員" and u.name != owner
        )
        mt.segments.append(
            Segment(
                start=start,
                end=end,
                owner=owner,
                kind=kind,
                time=group[0].time,
                chars=sum(u.chars for u in group if u.name == owner),
                responders=[n for n, _ in resp.most_common(4)],
                excerpt=excerpt_of(lines, group, owner),
            )
        )


def parse_decisions(mt: Meeting, lines: list[str], body_start: int, skip: list[tuple[int, int]]) -> None:
    def skipped(n: int) -> bool:
        return any(a <= n <= b for a, b in skip)

    i = body_start
    while i < len(lines):
        n = i + 1
        line = lines[i]
        if skipped(n):
            i += 1
            continue
        m = re.match(r"^(決議|決定)：(.*)$", line)
        if m:
            text = m.group(2).strip()
            j = i + 1
            while not text and j < len(lines) and j < i + 4:
                text = lines[j].strip()
                j += 1
            mt.decisions.append((n, f"{m.group(1)}：{text[:150]}"))
        elif re.match(r"^(關於本日.*|本項)?.*作如下決議：?$", line) or re.match(r"^本項通過決議\d+項", line):
            mt.decisions.append((n, line.strip()[:150]))
        i += 1


def build_meeting(path: Path, prev: Meeting | None) -> Meeting:
    meta, lines, body_start = read_md(path)
    title = meta.get("title", "")
    label, kind = meeting_label(title)
    mt = Meeting(
        code=meta.get("file_code") or path.stem,
        file=path.relative_to(PROJECT_ROOT).as_posix() if path.is_relative_to(PROJECT_ROOT) else str(path),
        date=meta.get("date", ""),
        title=title,
        label=label,
        kind=kind,
        chars=int(meta.get("chars", 0)),
        images=int(meta.get("images", 0)),
        mostly_images=str(meta.get("mostly_images", "false")).lower() == "true",
    )
    if not title and prev is not None:  # 沒有標題 → 前一份的續頁
        mt.continuation_of = prev.continuation_of or prev.code
        base = prev
        mt.title, mt.kind, mt.chair = base.title, base.kind, base.chair
        mt.label = base.label.removesuffix("（續）") + "（續）"
    parse_header(mt, lines, body_start)
    mt.utterances = parse_utterances(lines, body_start)
    build_segments(mt, lines)
    parse_decisions(mt, lines, body_start, minutes_regions(lines, mt.utterances))
    return mt


# ---------------------------------------------------------------- 輸出


def md_cell(s: str) -> str:
    return s.replace("|", "｜").replace("\n", " ")


def note_of(mt: Meeting) -> str:
    notes = []
    if mt.mostly_images:
        notes.append(f"⚠主要為圖片（{mt.images}張），未含文字")
    elif mt.images >= 20:
        notes.append(f"含{mt.images}張圖片附件（未含文字）")
    if mt.continuation_of:
        notes.append(f"續 {mt.continuation_of}")
    return "；".join(notes)


def write_meeting(mt: Meeting, out: Path) -> None:
    w = [f"# {mt.date} {mt.label}", ""]
    w.append(f"- 標題：{mt.title or '（無標題）'}")
    w.append(f"- 檔案：`{mt.file}`（代碼 {mt.code}，{mt.chars:,} 字）")
    for k, v in (("時間", mt.time), ("地點", mt.place), ("主席", mt.chair)):
        if v:
            w.append(f"- {k}：{v}")
    if note := note_of(mt):
        w.append(f"- 備註：{note}")
    if mt.agenda:
        w += ["", "## 議程", ""] + [f"- {a}" for a in mt.agenda]
    if mt.attendees:
        w += ["", "## 答詢官員／發言學者專家", "", "、".join(mt.attendees)]
    w += ["", "## 發言段落", "", "行號為此 md 檔的實際行號。字數為段落主角本人的發言字數。", ""]
    w.append("| # | 類型 | 發言者 | 時間 | 行號 | 字數 | 答詢／回應者 | 開頭摘錄 |")
    w.append("|---|---|---|---|---|---|---|---|")
    for k, s in enumerate(mt.segments, 1):
        w.append(
            f"| {k} | {s.kind} | {s.owner} | {s.time} | L{s.start}-L{s.end} | {s.chars:,} | "
            f"{md_cell('、'.join(s.responders))} | {md_cell(s.excerpt)} |"
        )
    if mt.decisions:
        w += ["", "## 決議／決定（不含開頭宣讀的上次議事錄）", ""]
        w += [f"- L{n}：{md_cell(t)}" for n, t in mt.decisions]
    (out / "meetings" / f"{mt.code}.md").write_text("\n".join(w) + "\n", encoding="utf-8")


def write_all(meetings: list[Meeting], out: Path) -> None:
    for sub in ("meetings", "legislators"):
        d = out / sub
        d.mkdir(parents=True, exist_ok=True)
        for old in d.glob("*.md"):
            old.unlink()

    # meetings.md
    w = [
        "# 會議一覽",
        "",
        f"共 {len(meetings)} 份檔案。原文在 `output/legislative_communiques/2026_MD/`，明細在 `meetings/<代碼>.md`。",
        "同一場會議可能分成多個檔案（多日、或續頁）。",
        "",
        "| 日期 | 會議 | 主席 | 議程摘要 | 段落 | 字數 | 代碼 | 備註 |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for mt in meetings:
        agenda = "；".join(a for a in mt.agenda if a not in ("報告事項", "討論事項", "宣讀上次會議議事錄。"))
        agenda = agenda[:110] + ("…" if len(agenda) > 110 else "")
        n_leg = sum(1 for s in mt.segments if s.kind in ("委員", "發言"))
        w.append(
            f"| {mt.date} | {md_cell(mt.label)} | {mt.chair} | {md_cell(agenda)} | {n_leg} | {mt.chars:,} | "
            f"[{mt.code}](meetings/{mt.code}.md) | {note_of(mt)} |"
        )
        write_meeting(mt, out)
    (out / "meetings.md").write_text("\n".join(w) + "\n", encoding="utf-8")

    # legislators
    by_leg: dict[str, list[tuple[Meeting, Segment]]] = defaultdict(list)
    for mt in meetings:
        for s in mt.segments:
            if s.kind in ("委員", "書面質詢") or (s.kind == "發言" and any(
                u.name == s.owner and u.role == "委員" for u in mt.utterances)):
                by_leg[s.owner].append((mt, s))
    w = [
        "# 委員一覽",
        "",
        "「段落」= 該委員連續主導的一段發言（質詢、逐條審查發言、書面質詢）。明細在 `legislators/<姓名>.md`。",
        "",
        "| 委員 | 段落 | 發言總字數 | 會議數 | 最早 | 最近 |",
        "|---|---|---|---|---|---|",
    ]
    for name, items in sorted(by_leg.items(), key=lambda kv: -sum(s.chars for _, s in kv[1])):
        dates = sorted(mt.date for mt, _ in items)
        w.append(
            f"| [{name}](legislators/{name}.md) | {len(items)} | {sum(s.chars for _, s in items):,} | "
            f"{len({mt.code for mt, _ in items})} | {dates[0]} | {dates[-1]} |"
        )
        rows = [
            f"# {name} 委員",
            "",
            "字數 < 200 的段落多為插話或程序發言。行號為該 md 檔的實際行號。",
            "",
            "| 日期 | 會議 | 類型 | 檔案:行號 | 字數 | 答詢／回應者 | 開頭摘錄 |",
            "|---|---|---|---|---|---|---|",
        ]
        for mt, s in sorted(items, key=lambda x: (x[0].date, x[0].code, x[1].start)):
            rows.append(
                f"| {mt.date} | {md_cell(mt.label)} | {s.kind} | {mt.code}:L{s.start}-L{s.end} | {s.chars:,} | "
                f"{md_cell('、'.join(s.responders))} | {md_cell(s.excerpt)} |"
            )
        (out / "legislators" / f"{name}.md").write_text("\n".join(rows) + "\n", encoding="utf-8")
    (out / "legislators.md").write_text("\n".join(w) + "\n", encoding="utf-8")

    # speakers.md（官員／學者專家）
    by_sp: dict[str, dict] = {}
    for mt in meetings:
        for u in mt.utterances:
            if u.role not in ("官員",):
                continue
            d = by_sp.setdefault(u.name, {"titles": Counter(), "meetings": {}})
            d["titles"][u.title] += 1
            m = d["meetings"].setdefault(mt.code, [mt, 0, u.start])
            m[1] += 1
    w = [
        "# 官員／學者專家一覽",
        "",
        "格式：會議代碼(發言次數, 首次發言行號)。公聽會的學者專家也在此。",
        "",
        "| 姓名 | 職稱 | 發言次數 | 出現的會議 |",
        "|---|---|---|---|",
    ]
    for name, d in sorted(by_sp.items(), key=lambda kv: -sum(m[1] for m in kv[1]["meetings"].values())):
        titles = "、".join(t for t, _ in d["titles"].most_common(3))
        ms = sorted(d["meetings"].values(), key=lambda m: (m[0].date, m[0].code))
        cells = "、".join(f"{m[0].date[5:]} {m[0].code}({m[1]}, L{m[2]})" for m in ms)
        w.append(f"| {name} | {titles} | {sum(m[1] for m in ms)} | {cells} |")
    (out / "speakers.md").write_text("\n".join(w) + "\n", encoding="utf-8")

    # segments.json
    data = []
    for mt in meetings:
        d = asdict(mt)
        d["utterances"] = [[u.start, u.end, u.name, u.role, u.title] for u in mt.utterances]
        data.append(d)
    (out / "segments.json").write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--src", type=Path, default=DEFAULT_SRC)
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = ap.parse_args()

    files = sorted(args.src.resolve().glob("*.md"))
    if not files:
        print(f"找不到 md：{args.src}（先執行 extract_doc_md.py）")
        return 1
    meetings: list[Meeting] = []
    for p in files:
        prev = meetings[-1] if meetings and meetings[-1].date == p.name[:10] else None
        meetings.append(build_meeting(p, prev))
    out = args.out.resolve()
    write_all(meetings, out)

    n_seg = sum(len(m.segments) for m in meetings)
    print(f"索引完成：{len(meetings)} 份檔案、{n_seg} 個發言段落 → {out}")
    for m in meetings:
        if not m.title and not m.continuation_of:
            print(f"  ⚠ 無標題且找不到同日前一份：{m.code}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
