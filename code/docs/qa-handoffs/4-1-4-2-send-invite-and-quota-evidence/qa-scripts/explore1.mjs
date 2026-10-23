import { member, call } from './lib.mjs'
import { launch, ctxFor, watch, WEB, EV } from './br.mjs'
import fs from 'node:fs'
const B = await member('brother'), S = await member('sister')
fs.writeFileSync('/tmp/claude-0/qa/ids.json', JSON.stringify({ B, S }))
const br = await launch(); const ctx = await ctxFor(br, B.cookie); const page = await ctx.newPage(); const log = []; watch(page, log)
await page.goto(WEB + '/decouvrir'); await page.waitForTimeout(2500)
console.log(page.url(), (await page.locator('[data-card-invite]').count()), 'invite buttons')
fs.mkdirSync('/tmp/claude-0/html', { recursive: true })
fs.writeFileSync('/tmp/claude-0/html/decouvrir.html', await page.content())
await page.screenshot({ path: '/tmp/claude-0/x1.png' })
console.log(log)
await br.close()
