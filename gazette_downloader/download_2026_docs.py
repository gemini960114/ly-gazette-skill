import concurrent.futures
from datetime import datetime
import hashlib
import html
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import threading
import time
import urllib.parse
import urllib.request
import zipfile

# 本檔位於 <專案>/gazette_downloader/；下載的 DOC 放在資料目錄，下載紀錄放在本目錄的 records/
HERE = Path(__file__).resolve().parent
BASE = HERE.parent / 'output' / 'legislative_communiques'
DOC_BASE = BASE / '2026_DOC'          # files.json 的 filename（DOC/xxx.doc）相對於此
DOC_DIR = DOC_BASE / 'DOC'            # 下載的公報 DOC（legislative-records skill 從這裡讀）
RECORDS = HERE / 'records'            # meetings.json、files.json、summary.json、ivod_dates.json、index.html
SEED = RECORDS / 'seed'               # 官方 API 會議清單 api_1.json、api_page2.json 等種子資料
SOURCES = RECORDS / 'sittings'        # 各場會議頁 HTML 快取
TODAY = '2026-11-08'
IVOD_URL = 'https://ivod.ly.gov.tw/Demand/ListCommittee/ListDate/8'
IVOD_DATES = '''11-02 10-29 10-28 10-22 10-21 10-15 10-08 08-26 08-19 08-12 08-05 07-30 07-27 07-20 07-16 07-13 07-09 07-02 07-01 06-29 06-25 06-24 06-18 06-17 06-15 06-11 06-10 06-04 05-28 05-25 05-21 05-18 05-07 05-06 04-30 04-29 04-22 04-15 04-13 04-09 04-08 04-01 03-25 03-23 03-18 03-11 01-19 01-08 01-07'''.split()
IVOD_DATES = sorted('2026-' + d for d in IVOD_DATES)
REQUEST_LOCK = threading.Lock()
LAST_REQUEST = 0.0

def get_bytes(url, timeout=20, deadline=75):
    global LAST_REQUEST
    with REQUEST_LOCK:
        time.sleep(max(0, 1.6 - (time.monotonic() - LAST_REQUEST)))
        LAST_REQUEST = time.monotonic()
    with tempfile.TemporaryDirectory(prefix='ly_doc_') as folder:
        path = Path(folder) / 'response.bin'
        result = subprocess.run(['C:/Windows/System32/curl.exe', '--silent', '--show-error', '--fail', '--location', '--connect-timeout', '12', '--max-time', '35', '--user-agent', 'Mozilla/5.0', '--output', str(path), url], capture_output=True, timeout=40)
        if result.returncode:
            error = result.stderr.decode('utf-8',errors='replace')
            if '429' in error:
                time.sleep(20)
            raise RuntimeError(error)
        return path.read_bytes()

class MeetingParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.docs = []
        self.texts = []

    def handle_starttag(self, tag, attrs):
        if tag == 'a':
            url = dict(attrs).get('href', '').replace('\\', '/')
            if '/communique1/' in url and re.search(r'\.docx?(?:\?|$)', url, re.I):
                self.docs.append(urllib.parse.urljoin('https://ppg.ly.gov.tw', url))

    def handle_data(self, text):
        if text.strip():
            self.texts.append(text.strip())

def iso_date(roc):
    year, month, day = map(int, roc.split('/'))
    return f'{year+1911:04}-{month:02}-{day:02}'

def discover(item):
    r = dict(item)
    r['date'] = iso_date(r['meetingDate'])
    r['ivod_listed_date'] = r['date'] in IVOD_DATES
    r['meeting_url'] = 'https://ppg.ly.gov.tw/ppg/sittings/' + r['id'].replace('-', '/') + '/details?' + urllib.parse.urlencode({'meetingDate': r['meetingDate'], 'meetingTime': r['meetingTime'], 'departmentCode': r.get('departmentCode') or 'null'})
    r['doc_urls'] = []
    if r['date'] > TODAY:
        r['status'] = '未來會議預告'
        return r
    if '取消' in r['meetingName']:
        r['status'] = '會議取消'
        return r
    if r['id'] == '2026031826':
        publication_url = 'https://ppg.ly.gov.tw/ppg/publications/official-gazettes/115/21/01/details'
        path = SOURCES / 'publication_115_21_01.html'
        try:
            data = path.read_bytes() if path.exists() else get_bytes(publication_url)
            path.write_bytes(data)
            parser = MeetingParser()
            parser.feed(data.decode('utf-8'))
            matches = [u for u in parser.docs if u.endswith('/LCIDC01_1152101_00005.doc')]
            if len(matches) != 1:
                raise ValueError('Expected hearing DOC not found on official publication page')
            r.update(doc_urls=matches, status='找到DOC', publication_url=publication_url, note='會議頁回傳HTTP 400，改由官方第115卷第21期一冊公報出版頁核對。')
            return r
        except Exception as exc:
            r.update(status='會議頁讀取失敗', error=str(exc))
            return r
    path = SOURCES / f'{r["date"]}_{r["id"]}.html'
    for attempt in range(2):
        try:
            data = path.read_bytes() if path.exists() else get_bytes(r['meeting_url'], deadline=50)
            parser = MeetingParser()
            parser.feed(data.decode('utf-8'))
            if not any(t in '\n'.join(parser.texts) for t in ['公報紀錄', '會議影片', '本次會議議事錄']):
                raise ValueError('Unexpected meeting page content')
            path.write_bytes(data)
            r['doc_urls'] = list(dict.fromkeys(parser.docs))
            r['status'] = '找到DOC' if r['doc_urls'] else '官方會議頁未提供公報DOC'
            break
        except Exception as exc:
            r['status'] = '會議頁讀取失敗'
            r['error'] = str(exc)
    print(f'查核 {r["date"]} {r["id"]} {r["status"]}', flush=True)
    return r

def download(pair):
    url, linked = pair
    first = min(linked, key=lambda r:(r['date'], r['id']))
    original = url.split('/')[-1].split('?')[0]
    m = re.search(r'第(\d+)屆第(\d+)會期.*?第(\d+)次', first['meetingName'])
    descriptor = f'第{m[1]}屆第{m[2]}會期_第{m[3]}次' if m else ('公聽會' if '公聽會' in first['meetingName'] else '其他會議')
    filename = f'{first["date"]}_教文_{descriptor}_{original}'
    target = DOC_DIR / filename
    result = {'url': url, 'filename': 'DOC/' + filename, 'meeting_ids': [r['id'] for r in linked], 'dates': sorted(set(r['date'] for r in linked))}
    for attempt in range(3):
        try:
            if not target.exists():
                global LAST_REQUEST
                with REQUEST_LOCK:
                    time.sleep(max(0, 1.6 - (time.monotonic() - LAST_REQUEST)))
                    LAST_REQUEST = time.monotonic()
                partial = target.with_suffix(target.suffix + f'.worker-{os.getpid()}.part')
                # The official endpoint does not support HTTP byte ranges.
                # Give large originals enough time rather than attempting resume.
                command = ['C:/Windows/System32/curl.exe','--silent','--show-error','--fail','--location','--connect-timeout','12','--max-time','900','--user-agent','Mozilla/5.0','--output',str(partial),url]
                completed = subprocess.run(command,capture_output=True,timeout=905)
                if completed.returncode:
                    raise RuntimeError(completed.stderr.decode('utf-8',errors='replace'))
                data = partial.read_bytes()
            else:
                data = target.read_bytes()
            if not (data.startswith(bytes.fromhex('D0CF11E0A1B11AE1')) or (url.lower().endswith('.docx') and data.startswith(b'PK'))):
                raise ValueError('Unexpected Word document signature')
            partial = target.with_suffix(target.suffix + f'.worker-{os.getpid()}.part')
            if partial.exists():
                partial.replace(target)
            result.update(status='已下載', bytes=len(data), sha256=hashlib.sha256(data).hexdigest())
            print(f'完成 {filename} {len(data)} bytes', flush=True)
            return result
        except Exception as exc:
            result.update(status='下載失敗', error=str(exc))
            print(f'重試 {original} {attempt+1}: {exc}', flush=True)
    return result

def main():
    SOURCES.mkdir(parents=True, exist_ok=True)
    DOC_DIR.mkdir(parents=True, exist_ok=True)
    rows = []
    for name in ['api_1.json', 'api_page2.json']:
        rows += json.loads((SEED / name).read_text('utf-8'))['items']
    rows = list({(r['id'], r['meetingDate']): r for r in rows}.values())
    # This IVOD-listed hearing is absent from the official search API's index;
    # its official sitting URL was located independently by date and title.
    rows.append(dict(id='2026031826', meetingDate='115/03/23', meetingName='立法院第11屆第5會期教育及文化委員會公聽會', meetingTime='09:00-17:30', meetingUnit='教育及文化', title='「校園安全與受教權的平衡：從《國民轉介教育條例草案》看高風險學生安置機制之建立」公聽會'))
    for date, sid in [('2026-04-29','2026042129'),('2026-06-17','2026061262')]:
        cached=SEED/f'{date}_meeting.html'
        if cached.exists():
            (SOURCES/f'{date}_{sid}.html').write_bytes(cached.read_bytes())
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        meetings = list(pool.map(discover, rows))
    (RECORDS / 'meetings.json').write_text(json.dumps(meetings, ensure_ascii=False, indent=2), 'utf-8')
    by_url = {}
    for r in meetings:
        for url in r['doc_urls']:
            by_url.setdefault(url, []).append(r)
    print(f'會議 {len(meetings)} 筆；不重複DOC {len(by_url)} 份', flush=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        files = list(pool.map(download, by_url.items()))
    (RECORDS / 'files.json').write_text(json.dumps(files, ensure_ascii=False, indent=2), 'utf-8')
    write_index(meetings, files)

def write_index(meetings, files):
    lookup = {f['url']:f for f in files}
    table = []
    for r in sorted(meetings, key=lambda r:(r['date'], r['id'])):
        links = []
        statuses = []
        for url in r['doc_urls']:
            f = lookup[url]
            statuses.append(f['status'])
            local = os.path.relpath(DOC_BASE / f['filename'], RECORDS).replace('\\', '/')  # index.html 在 records/
            links.append(f'<a href="{urllib.parse.quote(local)}">本機 DOC（{f["bytes"]/1e6:.2f} MB）</a>' if f['status']=='已下載' else '')
            links.append(f'<a href="{html.escape(url)}">官方 DOC</a>')
        status = '、'.join(sorted(set(statuses))) or r['status']
        if r.get('publication_url'):
            links.append(f'<a href="{html.escape(r["publication_url"])}">官方公報出版頁</a>')
        r['download_status'] = status
        table.append(f'<tr><td>{r["date"]}</td><td>{html.escape(r["meetingName"])}<details><summary>會議事由</summary>{html.escape(r["title"])}</details></td><td>{status}</td><td>{" ／ ".join(filter(None,links))}<br><a href="{html.escape(r["meeting_url"])}">官方會議頁</a></td></tr>')
    covered = {r['date'] for r in meetings}
    unmatched = sorted(set(IVOD_DATES)-covered)
    totals = {'checked_on':TODAY,'ivod_dates':len(IVOD_DATES),'ivod_dates_without_ppg_match':unmatched,'meeting_records':len(meetings),'downloaded_docs':sum(f['status']=='已下載' for f in files),'failed_docs':sum(f['status']!='已下載' for f in files),'total_bytes':sum(f.get('bytes',0) for f in files)}
    (RECORDS / 'summary.json').write_text(json.dumps(totals, ensure_ascii=False, indent=2),'utf-8')
    (RECORDS / 'ivod_dates.json').write_text(json.dumps({'source_url':IVOD_URL,'checked_on':TODAY,'dates':IVOD_DATES},ensure_ascii=False,indent=2),'utf-8')
    (RECORDS / 'meetings.json').write_text(json.dumps(meetings, ensure_ascii=False, indent=2),'utf-8')
    page = '<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>2026 教文委員會公報 DOC</title><style>body{font:16px/1.65 system-ui,sans-serif;max-width:1400px;margin:40px auto;padding:0 24px;color:#17354a;background:#f5f8fa}table{border-collapse:collapse;width:100%;background:white}td,th{padding:12px;text-align:left;border-bottom:1px solid #d6e0e7;vertical-align:top}th{background:#173f53;color:white;position:sticky;top:0}td:first-child{white-space:nowrap}a{color:#00658a}details{font-size:14px;color:#5b6b74;white-space:pre-line}input{padding:12px;width:70%;font:inherit}</style><h1>2026 年教育及文化委員會公報紀錄 DOC</h1>'
    page += f'<p>查核日期：{TODAY}。已下載 {totals["downloaded_docs"]} 份不重複 DOC，合計 {totals["total_bytes"]/1e6:.2f} MB。</p><p>從 <a href="{IVOD_URL}">IVOD 主辦單位日期入口</a>的 49 個 2026 年日期出發，另以官方議事暨公報資訊網全年查詢結果補充。清單包含考察、取消會議、未來預告及未提供 DOC 的項目；未提供連結不等同證明尚未出版。只下載查核日以前已提供的公報 DOC，原檔未轉換。</p>'
    page += '<p>同一份 DOC 若對應多個日期或會議頁，檔案只下載一次，清單保留各筆對照。「官方會議頁未提供公報DOC」表示查核當下該頁未提供下載連結。</p>'
    if unmatched: page += '<p>IVOD 日期尚待對應：' + '、'.join(unmatched) + '</p>'
    page += '<p><input id="q" placeholder="搜尋日期、會次、議題或下載狀態" oninput="document.querySelectorAll(\'tbody tr\').forEach(r=>r.hidden=!r.textContent.toLowerCase().includes(this.value.toLowerCase()))"></p><table><thead><tr><th>日期</th><th>會議與議題</th><th>狀態</th><th>檔案及來源</th></tr></thead><tbody>'+''.join(table)+'</tbody></table><p><a href="meetings.json">完整會議清單</a> ／ <a href="files.json">下載紀錄及校驗值</a> ／ <a href="summary.json">統計</a></p></html>'
    (RECORDS / 'index.html').write_text(page, 'utf-8')
    # 打包：DOC 原檔 + 清單紀錄（不含 seed/sittings 快取與 .part）
    with zipfile.ZipFile(BASE / '2026_教文委員會_公報DOC.zip','w',compression=zipfile.ZIP_DEFLATED,compresslevel=1) as z:
        for p in DOC_DIR.iterdir():
            if p.is_file() and p.suffix != '.part':
                z.write(p, arcname=f'2026_DOC/DOC/{p.name}')
        for p in RECORDS.iterdir():
            if p.is_file():
                z.write(p, arcname=f'2026_DOC/records/{p.name}')
    print(json.dumps(totals,ensure_ascii=False),flush=True)

if __name__ == '__main__':
    main()
