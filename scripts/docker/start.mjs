// Container entry point (Dockerfile CMD): apply migrations, start the Next standalone server, then
// refresh the pages the image prerendered without a database (lib/build-phase).
import { spawn, spawnSync } from 'node:child_process'
import { revalidate } from '../revalidate.mjs'

const migrate = spawnSync(process.execPath, ['node_modules/payload/bin.js', 'migrate'], { stdio: 'inherit' })
if (migrate.status !== 0) process.exit(migrate.status ?? 1)

const server = spawn(process.execPath, ['server/server.js'], { stdio: 'inherit' })
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.kill(signal))
server.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)))

try {
  await revalidate()
  console.log('public pages refreshed from the database')
} catch (err) {
  // The site still works (pages regenerate hourly), but say so loudly.
  console.error(`page refresh on boot failed: ${err instanceof Error ? err.message : err}`)
}
