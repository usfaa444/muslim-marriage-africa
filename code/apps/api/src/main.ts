import { assertEmailBoot } from './email-port.js'
import { installScanMetrics } from './otel-contract.js'
import { assertRecaptchaBoot } from './recaptcha.js'
import { assertPublicOriginBoot } from './public-origin.js'
import { assertCookieSecureBoot } from './session-cookie.js'
import { assertSmsBoot } from './sms-port.js'
import { processRole, runWorkerProcess } from './worker-shell.js'

assertRecaptchaBoot(process.env)
assertEmailBoot(process.env)
assertPublicOriginBoot(process.env)
assertCookieSecureBoot(process.env)
installScanMetrics(process.env)

if (processRole() === 'worker') {
  const outcome = await runWorkerProcess()
  if ('exitCode' in outcome) {
    process.stderr.write(outcome.message)
    process.exit(outcome.exitCode)
  }
} else {
  // Only the api sends codes. The worker does not read the SMS settings.
  assertSmsBoot(process.env)
  const { createApp } = await import('./create-app.js')
  const { listenPort } = await import('./listen-port.js')

  const app = await createApp()
  await app.listen(listenPort())
}
