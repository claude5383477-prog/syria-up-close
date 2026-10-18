// npm run fonts:subset — creates .venv with requirements-dev.txt if needed, then runs subset.py.
// Repeatable: the outputs depend only on the pinned font package and the pinned fonttools version.
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const venv = '.venv'
const py = process.platform === 'win32' ? join(venv, 'Scripts', 'python.exe') : join(venv, 'bin', 'python')
const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit' })

if (!existsSync(py)) {
  run(process.platform === 'win32' ? 'python' : 'python3', ['-m', 'venv', venv])
}
run(py, ['-m', 'pip', 'install', '--quiet', '--disable-pip-version-check', '-r', 'requirements-dev.txt'])
run(py, ['scripts/fonts/subset.py'])
