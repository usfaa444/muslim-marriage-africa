import {chromium} from '/home/claude/ankanu-qa-staff/code/node_modules/playwright/index.mjs'
import AxeBuilder from '/home/claude/ankanu-qa-staff/code/node_modules/@axe-core/playwright/dist/index.mjs'
import fs from 'node:fs'
const Q=process.cwd(); const BASE='http://localhost:4061'
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'})
const ctx=await b.newContext({storageState:'ui-state.json',viewport:{width:1280,height:900}})
await ctx.route('https://cdn.tailwindcss.com/**',r=>{r.fulfill({contentType:'application/javascript',body:`window.tailwind={};(function(){var s=document.createElement('style');s.textContent=${JSON.stringify(fs.readFileSync('tw/page-staff_visit-signals.out.css','utf8'))};document.head.appendChild(s)})()`})})
await ctx.route(/fonts\./,r=>r.abort())
const p=await ctx.newPage(); await p.goto(BASE+'/staff/visit-signals'); await p.waitForLoadState('networkidle')
const r=await new AxeBuilder({page:p}).withTags(['wcag2aa']).analyze()
for(const v of r.violations) for(const n of v.nodes) console.log(v.id,n.target.join(' '),n.any[0]?.message?.slice(0,160))
