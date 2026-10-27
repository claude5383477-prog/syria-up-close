"""Contact sheets for harvest/places.json: one row per topic (up to 6 candidates), 8 topics per sheet."""
import json, os, subprocess, time, urllib.request

UA = 'SyriaUpClose/1.0 (https://upclosesyria.com; photo-harvest)'
data = json.load(open('harvest/places.json'))
os.makedirs('harvest/pthumbs', exist_ok=True)
os.makedirs('harvest/sheets', exist_ok=True)
index = []
rows = []
for t, (key, v) in enumerate(data.items()):
    index.append(f'{t:03d} {key} :: {v["query"]}')
    tiles = []
    for c, cand in enumerate(v['candidates'][:6]):
        out = f'harvest/pthumbs/{t:03d}-{c}.jpg'
        try:
            req = urllib.request.Request(cand['tiny'], headers={'User-Agent': UA})
            open(out + '.raw', 'wb').write(urllib.request.urlopen(req, timeout=30).read())
            subprocess.run(['convert', out + '.raw[0]', '-resize', '240x170^', '-gravity', 'center', '-extent', '240x170', out], check=True)
        except Exception:
            subprocess.run(['convert', '-size', '240x170', 'xc:gray', out])
        tiles.append(out)
        time.sleep(0.15)
    while len(tiles) < 6:
        out = f'harvest/pthumbs/{t:03d}-x{len(tiles)}.jpg'
        subprocess.run(['convert', '-size', '240x170', 'xc:white', out])
        tiles.append(out)
    rows.append((t, tiles))
open('harvest/places-index.txt', 'w').write('\n'.join(index))
for s in range(0, len(rows), 8):
    args = []
    for t, tiles in rows[s:s + 8]:
        for c, p in enumerate(tiles):
            args += ['-label', f'{t:03d}-{c}', p]
    subprocess.run(['montage', *args, '-tile', '6x', '-geometry', '240x170+4+4', '-pointsize', '18', f'harvest/sheets/places-{s // 8:02d}.jpg'], check=True)
