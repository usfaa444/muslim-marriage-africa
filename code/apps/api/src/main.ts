import { assertEmailBoot } from './email-port.js'
import { installScanMetrics } from './otel-contract.js'
import { assertRecaptchaBoot } from './recaptcha.js'
import { assertCookieSecureBoot } from './session-cookie.js'
import { processRole, runWorkerProcess } from './worker-shell.js'

assertRecaptchaBoot(process.env)
assertEmailBoot(process.env)
assertCookieSecureBoot(process.env)
installScanMetrics(process.env)

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
