// Copies the hotlinked photos of the owner's collection (`sv-*` keys in src/content/photos.json, served
// from pbs.twimg.com) into public/guide as 1280px WebP, and points photos.json at the local files, so
// the site no longer depends on X's image servers. Idempotent: a key already pointing at /guide/ is skipped.
//   npm run photos:localize        (needs internet access to pbs.twimg.com)
import { readFileSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'

const MANIFEST = 'src/content/photos.json'
const photos = JSON.parse(readFileSync(MANIFEST, 'utf8'))
let done = 0
for (const [key, p] of Object.entries(photos)) {
  if (!key.startsWith('sv-') || !p.src.startsWith('https://')) continue
  const res = await fetch(p.src)
  if (!res.ok) {
    console.warn(`photos:localize: ${key} → ${res.status}, kept as a link`)
    continue
  }
  const out = `public/guide/${key}.webp`
  const info = await sharp(Buffer.from(await res.arrayBuffer())).rotate().resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toFile(out)
  photos[key] = { ...p, src: `/guide/${key}.webp`, w: info.width, h: info.height }
  done++
}
writeFileSync(MANIFEST, `${JSON.stringify(photos, null, 1)}\n`)
console.log(`photos:localize: ${done} photos copied to public/guide`)
