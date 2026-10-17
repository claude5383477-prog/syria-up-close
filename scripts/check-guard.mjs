// Fails when the quality bar is quietly lowered: suppressions, skipped/focused tests, unimplemented stubs.
// Usage: node scripts/check-guard.mjs [dir...]   (defaults to src tests e2e)
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const RULES = [
  { id: 'ts-ignore', re: /@ts-ignore|@ts-nocheck/ },
  { id: 'ts-expect-error-without-reason', re: /@ts-expect-error(?!\s+\S)/ },
  { id: 'eslint-disable', re: /eslint-disable/ },
  { id: 'skipped-or-focused-test', re: /\b(?:it|test|describe)\.(?:skip|only|todo)\s*\(|\bx(?:it|describe)\s*\(/ },
  { id: 'unimplemented-stub', re: /throw new Error\(\s*['"`]not implemented/i },
]

const EXT = /\.(?:[cm]?[jt]sx?)$/
const roots = process.argv.slice(2).length ? process.argv.slice(2) : ['src', 'tests', 'e2e']

function* walk(dir) {
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }
  for (const name of entries) {
    if (name === 'node_modules' || name.startsWith('.')) continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) yield* walk(full)
    else if (EXT.test(name)) yield full
  }
}

const hits = []
for (const root of roots) {
  for (const file of walk(root)) {
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, i) => {
        for (const rule of RULES) {
          if (rule.re.test(line)) hits.push(`${relative('.', file)}:${i + 1}  [${rule.id}]  ${line.trim()}`)
        }
      })
  }
}

if (hits.length) {
  console.error(`check-guard: ${hits.length} violation(s) — see CONSTRAINTS.md "Floor"\n` + hits.join('\n'))
  process.exit(1)
}
console.log('check-guard: clean')
