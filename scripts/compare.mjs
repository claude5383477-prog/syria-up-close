// Joins prototype and site screenshots side by side for review: e2e/__screenshots__/compare/<id>.png
// Left: prototype (docs/source/syria-up-close.html). Right: the built site.
import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import sharp from 'sharp'

const DIR = 'e2e/__screenshots__'
mkdirSync(`${DIR}/compare`, { recursive: true })
const MAX_H = 3200
const GAP = 24

for (const file of readdirSync(`${DIR}/pages`).filter((f) => f.endsWith('.png'))) {
  const proto = `${DIR}/prototype/${file}`
  if (!existsSync(proto)) continue
  const [a, b] = await Promise.all([proto, `${DIR}/pages/${file}`].map(async (p) => {
    const img = sharp(p)
    const { width, height } = await img.metadata()
    const h = Math.min(height, MAX_H)
    return { buf: await img.extract({ left: 0, top: 0, width, height: h }).png().toBuffer(), width, height: h }
  }))
  await sharp({ create: { width: a.width + b.width + GAP, height: Math.max(a.height, b.height), channels: 3, background: '#888888' } })
    .composite([
      { input: a.buf, left: 0, top: 0 },
      { input: b.buf, left: a.width + GAP, top: 0 },
    ])
    .png()
    .toFile(`${DIR}/compare/${file}`)
}
console.log(`compare images in ${DIR}/compare`)
