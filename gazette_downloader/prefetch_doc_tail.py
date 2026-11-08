import concurrent.futures
import json
from download_2026_docs import RECORDS, DOC_DIR, download

meetings = json.loads((RECORDS / 'meetings.json').read_text('utf-8'))
groups = {}
for meeting in meetings:
    for url in meeting['doc_urls']:
        groups.setdefault(url, []).append(meeting)

def work(pair):
    url, _ = pair
    original = url.split('/')[-1]
    if list(DOC_DIR.glob('*'+original+'.part')):
        print('主下載程序已處理：'+original,flush=True)
        return None
    return download(pair)

if __name__ == '__main__':
    # Work from the other end of the queue so the smaller, older records can
    # finish while the existing workers handle the large June/July originals.
    tail = list(groups.items())[-20:][::-1]
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        results = [r for r in pool.map(work,tail) if r]
    (RECORDS/'prefetched_files.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),'utf-8')
    print('額外同步下載完成',len(results),flush=True)
