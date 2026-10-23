import * as L from './lib.mjs'
import { readFileSync } from 'node:fs'
const st = JSON.parse(readFileSync('state.json')); const A = st.memberA
const c = new L.Client(); c.noRetry = true; const ck = st.mod1.cookie
await L.sleep(61000)
const rs = await Promise.all(Array.from({ length: 35 }, () => c.get(`/v1/staff/review/evidence/${A.idRec}`, { cookie: ck })))
console.log('before restart:', rs.filter(r => r.status === 200).length, 'x200', rs.filter(r => r.status === 429).length, 'x429')
