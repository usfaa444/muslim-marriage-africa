import * as L from './lib.mjs'
import { writeFileSync } from 'node:fs'
const m = await L.createMember({ photo: false }); const r = await m.get('/id-liveness'); writeFileSync('html/idlive.html', r.buf); writeFileSync('memberP.json', JSON.stringify({ id: m.id, cookie: m.cookieHeader() })); console.log(r.status, r.buf.length)
