import * as L from './lib.mjs'
import { writeFileSync } from 'node:fs'
const out = {}
for (const n of ['J', 'K']) {
  const m = await L.createMember({ pseudo: `Revue_${n}_${Date.now() % 100000}` }); const cap = await L.captureBoth(m)
  out[n] = { id: m.id, cookie: m.cookieHeader(), pseudo: m.pseudo, idRec: cap.id.json.id, liveRec: cap.live.json.id, pose: cap.ch.json.pose, photoId: m.photoId }
}
L.sql(`update profile set review_queued_at = now() - interval '30 hours' where account_id='${out.K.id}'`)
writeFileSync('state3.json', JSON.stringify(out, null, 1)); console.log(JSON.stringify(out))
