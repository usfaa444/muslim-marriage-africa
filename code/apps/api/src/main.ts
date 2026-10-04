import { processRole, runWorkerProcess } from './worker-shell.js'

if (processRole() === 'worker') {
  const outcome = await runWorkerProcess()
  if ('exitCode' in outcome) {
    process.stderr.write(outcome.message)
    process.exit(outcome.exitCode)
  }
} else {
  const { createApp } = await import('./create-app.js')
  const { listenPort } = await import('./listen-port.js')

  const app = await createApp()
  await app.listen(listenPort())
}
