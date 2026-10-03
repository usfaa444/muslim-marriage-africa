import { processRole, runWorkerShell } from './worker-shell.js'

if (processRole() === 'worker') {
  const result = runWorkerShell()
  process.stderr.write(result.message)
  process.exit(result.exitCode)
}

const { createApp } = await import('./create-app.js')
const { listenPort } = await import('./listen-port.js')

const app = await createApp()
await app.listen(listenPort())
