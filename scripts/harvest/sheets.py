"""Contact sheets for reviewing harvest output by eye (Pillow only).
City files harvest/<slug>.json -> sheets/<slug>-N.jpg (6x5 tiles, labelled with the index).
harvest/places.json -> sheets/places-N.jpg (one row per topic, labelled topic-candidate)."""
import io, json, os, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageDraw, ImageOps

UA = 'SyriaUpClose/1.0 (https://upclosesyria.com; photo-harvest)'
W, H, LBL = 240, 170, 22
os.makedirs('harvest/sheets', exist_ok=True)


def fetch(url):
    for i in range(3):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            img = Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=30).read())).convert('RGB')
            return ImageOps.fit(img, (W, H))
        except Exception:
            time.sleep(1 + i)
    return Image.new('RGB', (W, H), (128, 128, 128))


def sheet(tiles, cols, path):
    rows = (len(tiles) + cols - 1) // cols
    out = Image.new('RGB', (cols * (W + 8), rows * (H + LBL + 8)), 'white')
    d = ImageDraw.Draw(out)
    for n, (label, img) in enumerate(tiles):
        x, y = (n % cols) * (W + 8) + 4, (n // cols) * (H + LBL + 8) + 4
        if img is not None:
            out.paste(img, (x, y))
        d.text((x + 2, y + H + 3), label, fill='black')
    out.save(path, quality=80)


def get_all(urls):
    with ThreadPoolExecutor(6) as ex:
        return list(ex.map(fetch, urls))


mode = sys.argv[1]
if mode == 'cities':
    for f in sorted(os.listdir('harvest')):
        if not f.endswith('.json') or f in ('summary.json', 'places.json'):
            continue
        slug = f[:-5]
        items = json.load(open(f'harvest/{f}'))
        imgs = get_all([c['tiny'] for c in items])
        tiles = [(f'{i:03d}', im) for i, im in enumerate(imgs)]
        for s in range(0, len(tiles), 30):
            sheet(tiles[s:s + 30], 6, f'harvest/sheets/{slug}-{s // 30}.jpg')
else:
    data = json.load(open('harvest/places.json'))
    index, tiles = [], []
    for t, (key, v) in enumerate(data.items()):
        index.append(f'{t:03d} {key} :: {v["query"]}')
        cands = v['candidates'][:6]
        imgs = get_all([c['tiny'] for c in cands])
        row = [(f'{t:03d}-{c}', im) for c, im in enumerate(imgs)]
        row += [('', None)] * (6 - len(row))
        tiles += row
    open('harvest/places-index.txt', 'w').write('\n'.join(index))
    for s in range(0, len(tiles), 48):
        sheet(tiles[s:s + 48], 6, f'harvest/sheets/places-{s // 48:02d}.jpg')
