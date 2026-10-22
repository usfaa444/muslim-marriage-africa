import * as L from './lib.mjs'
import { readFileSync } from 'node:fs'
const st = JSON.parse(readFileSync('state.json')); const A = st.memberA
const c = new L.Client(); c.noRetry = true
const rs = await Promise.all(Array.from({ length: 30 }, () => c.get(`/v1/staff/review/evidence/${A.idRec}`, { cookie: st.mod1.cookie })))
console.log('after API restart, same session:', rs.filter(r => r.status === 200).length, 'x200', rs.filter(r => r.status === 429).length, 'x429 (counter reset: 30 more views in the same minute)')
