// AC4: every control the save sends counts as an unsaved edit and is saved before /pin opens.
import { launch, memberContext, watch, sleep, BASE, SC, EV } from './lib.mjs'
import { writeFileSync } from 'node:fs'
const label = process.argv[2] ?? 'pinfail'
const out = []
const say = (s) => { out.push(s); console.log(s) }
const browser = await launch()
const ctx = await memberContext(browser, label, { width: 390, height: 800 })
const page = await ctx.newPage()
const log = []
watch(page, log)
let puts = []
page.on('request', (r) => { const u = new URL(r.url()); if (u.pathname === '/v1/me/profile' && r.method() === 'PUT') puts.push(JSON.parse(r.postData() || '{}')) })
const open = async () => { await page.goto(`${BASE}/profile-edit`, { waitUntil: 'load' }); await page.waitForFunction(() => /^\d{4}-/.test(document.getElementById('dob').value), null, { timeout: 15000 }); await sleep(300) }
const options = async (id) => page.$$eval(`#${id} option`, (o) => o.map((x) => x.value))
const cases = [
  ['dob', async () => page.fill('#dob', '1991-02-03'), (p) => p.dob === '1991-02-03'],
  ['origin', async () => page.fill('#origin', 'Origine QA'), (p) => p.origin === 'Origine QA'],
  ['country_residence', async () => { const o = await options('country_residence'); await page.selectOption('#country_residence', o[o.length - 1]) }, (p) => p.country != null],
  ['city_residence', async () => { const o = await options('city_residence'); await page.selectOption('#city_residence', o[o.length - 1]) }, (p) => p.city != null],
  ['marital_status', async () => page.locator('input[name="marital_status"][value="divorce"]').check({ force: true }), (p) => p.marital_status != null],
  ['polygyny_intent', async () => page.locator('input[name="polygyny_intent"][value="non"]').check({ force: true }), (p) => p.polygamy_intent != null],
  ['education', async () => page.selectOption('#education', 'doctorat'), (p) => p.education === 'doctorat'],
  ['job', async () => page.selectOption('#job', 'sante'), (p) => p.profession === 'sante'],
  ['madhhab', async () => page.locator('input[name="madhhab"][value="shafii"]').check({ force: true }), (p) => p.madhhab === 'shafii'],
  ['religious_practice', async () => page.locator('input[name="religious_practice"][value="assidue"]').check({ force: true }), (p) => p.practice === 'assidue'],
  ['marriage_timeframe', async () => page.locator('input[name="marriage_timeframe"][value="1year"]').check({ force: true }), (p) => String(p.life_plans || '').includes('tf:1year')],
  ['intentions', async () => page.fill('#intentions', 'Intentions QA éàç'), (p) => String(p.life_plans || '').includes('Intentions QA')],
  ['bio', async () => page.fill('#bio', 'Bio QA'), (p) => p.bio_pending === 'Bio QA'],
]
for (const [name, act, check] of cases) {
  await open()
  puts = []
  await act()
  await page.locator('label:has(#profile-pin)').first().click()
  await page.waitForURL(/\/pin\?next=/, { timeout: 10000 }).catch(() => {})
  await sleep(300)
  const atPin = /\/pin\?next=%2Fprofile-edit$/.test(page.url())
  say(`${name}: saves=${puts.length} sentTheEdit=${puts[0] ? !!check(puts[0]) : false} openedPin=${atPin}`)
}
say(`problems: ${JSON.stringify(log.filter((l) => !/tailwind|ERR_BLOCKED_BY_CLIENT/.test(l)))}`)
writeFileSync(`${EV}/ac4-every-field.txt`, out.join('\n') + '\n')
await browser.close()
