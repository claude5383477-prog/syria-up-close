// Breaks a page's HTML into parts (inline CSS, RSC payload, markup) with raw and gzip sizes.
// Usage: node scripts/html-anatomy.mjs <url> [cookie]
import { gzipSync } from 'node:zlib'

const [url, cookie] = process.argv.slice(2)
const html = await (await fetch(url, { headers: cookie ? { cookie } : {} })).text()
const take = (re) => [...html.matchAll(re)].map((m) => m[0]).join('')
const parts = {
  'inline <style>': take(/<style[\s\S]*?<\/style>/g),
  'RSC payload <script>': take(/<script>self\.__next_f[\s\S]*?<\/script>/g),
  'other <script>': take(/<script(?!>self\.__next_f)[\s\S]*?<\/script>/g),
}
const markup = Object.values(parts).reduce((h, p) => h.replace(p, ''), html)
const kb = (s) => `${(Buffer.byteLength(s) / 1024).toFixed(1)}KB raw, ${(gzipSync(s).length / 1024).toFixed(1)}KB gz`
console.log(`whole document: ${kb(html)}`)
for (const [k, v] of Object.entries(parts)) console.log(`${k.padEnd(22)} ${kb(v)}`)
console.log(`${'markup'.padEnd(22)} ${kb(markup)}`)
