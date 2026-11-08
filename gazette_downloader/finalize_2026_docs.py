import concurrent.futures
import hashlib
import json
import mmap
from pathlib import Path
import zipfile

from download_2026_docs import RECORDS, BASE, DOC_BASE, DOC_DIR, IVOD_DATES, download, write_index

if __name__ == '__main__':
    meetings = json.loads((RECORDS/'meetings.json').read_text('utf-8'))
    groups = {}
    for r in meetings:
        for url in r['doc_urls']:
            groups.setdefault(url, []).append(r)
    # Reconcile all workers against the completed files, retrying only missing
    # originals. This also replaces early failure statuses after repairs.
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        files = list(pool.map(download, groups.items()))
    failures = [f for f in files if f['status'] != '已下載']
    if failures:
        (RECORDS/'remaining_failures.json').write_text(json.dumps(failures,ensure_ascii=False,indent=2),'utf-8')
        raise RuntimeError(f'{len(failures)} DOC downloads still failed')
    for record in files:
        p = DOC_BASE/record['filename']
        with p.open('rb') as stream, mmap.mmap(stream.fileno(),0,access=mmap.ACCESS_READ) as data:
            if data.find('WordDocument'.encode('utf-16le')) < 0:
                raise ValueError(f'Missing WordDocument stream: {p.name}')
        if p.stat().st_size != record['bytes']:
            raise ValueError('File length mismatch')
    if set(IVOD_DATES) - {r['date'] for r in meetings}:
        raise ValueError('Unmatched IVOD dates remain')
    for partial in DOC_DIR.glob('*.part'):
        partial.unlink()
    (RECORDS/'files.json').write_text(json.dumps(files,ensure_ascii=False,indent=2),'utf-8')
    write_index(meetings,files)
    archive = BASE/'2026_教文委員會_公報DOC.zip'
    with zipfile.ZipFile(archive) as z:
        if z.testzip() is not None:
            raise ValueError('ZIP integrity check failed')
        doc_entries = [x for x in z.namelist() if x.lower().endswith('.doc')]
        if len(doc_entries) != len(files):
            raise ValueError('Archive DOC count mismatch')
    print(json.dumps({'documents':len(files),'total_bytes':sum(f['bytes'] for f in files),'zip_bytes':archive.stat().st_size,'archive':str(archive.resolve()),'index':str((RECORDS/'index.html').resolve())},ensure_ascii=False),flush=True)
