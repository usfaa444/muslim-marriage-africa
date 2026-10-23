import fs from 'node:fs'
import { launch, ctxFor, watch, WEB } from './br.mjs'
const { B, S } = JSON.parse(fs.readFileSync('ids.json'))
const br = await launch(); const ctx = await ctxFor(br, B.cookie); const page = await ctx.newPage()
await page.goto(WEB + '/decouvrir'); await page.waitForTimeout(2000)
fs.writeFileSync('/tmp/claude-0/html/decouvrir.html', await page.content())
await page.goto(WEB + '/invitations/envoyer/' + S.id); await page.waitForTimeout(2500)
fs.writeFileSync('/tmp/claude-0/html/compose.html', await page.content())
await page.goto(WEB + '/profil/' + S.id); await page.waitForTimeout(2500)
fs.writeFileSync('/tmp/claude-0/html/profil.html', await page.content())
await br.close()
