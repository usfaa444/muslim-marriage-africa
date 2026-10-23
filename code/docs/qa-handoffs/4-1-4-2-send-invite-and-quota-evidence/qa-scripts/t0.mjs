import {member,call} from './lib.mjs'
const b = await member('brother'); const s = await member('sister')
console.log(b.cookie.slice(0,30), (await call('/v1/invites/quota', b.cookie)).json)
console.log(JSON.stringify((await call('/v1/invites',b.cookie,'POST',{to_id:s.id})).json))
