import * as L from './lib.mjs'
import { createRequire } from 'node:module'
import { readFileSync, writeFileSync } from 'node:fs'
const { PNG } = createRequire('/home/claude/ankanu-qa-review/code/package.json')('pngjs')
const st3 = JSON.parse(readFileSync('state3.json'))
function pic(w, h, seed) { const p = new PNG({ width: w, height: h }); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; p.data[i] = (x * 255 / w + seed) % 256; p.data[i+1] = (y * 255 / h) ; p.data[i+2] = seed; p.data[i+3] = 255 }; return PNG.sync.write(p) }
for (const n of ['J','K']) {
  const c = new L.Client(); c.jar.set('ankanu_session', st3[n].cookie.split('=')[1])
  let r = await c.post('/v1/verifications/id', { image: pic(480, 300, 40).toString('base64') }); console.log(n, 'id png', r.status, JSON.stringify(r.json?.error ?? r.json))
  const ch = await L.challenge(c); st3[n].pose = ch.json.pose
  r = await c.post('/v1/verifications/liveness', { image: pic(300, 400, 120).toString('base64'), challenge_id: ch.json.challenge_id }); console.log(n, 'selfie png', r.status, JSON.stringify(r.json?.error ?? r.json))
  st3[n].liveRec = r.json.id
}
writeFileSync('state3.json', JSON.stringify(st3, null, 1))
