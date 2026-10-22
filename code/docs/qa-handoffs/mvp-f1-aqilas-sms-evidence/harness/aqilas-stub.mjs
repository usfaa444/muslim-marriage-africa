// QA stand-in for Aqilas. Controllable at runtime: POST /__mode {"status":201,"delay":0,"mode":"normal|redirect|hangbody|slowbody|bigbody"}
import { createServer, request as httpRequest } from 'node:http'
let mode = { status: 201, delay: 0, mode: 'normal' }
const seen = []
createServer((req, res) => {
  let body = ''
  req.on('data', (c) => (body += c))
  req.on('end', () => {
    if (req.url === '/__mode') { mode = { ...mode, ...JSON.parse(body || '{}') }; res.end(JSON.stringify(mode)); return }
    if (req.url === '/__seen') { res.writeHead(200, {'content-type':'application/json'}); res.end(JSON.stringify(seen)); return }
    if (req.url === '/__reset') { seen.length = 0; res.end('ok'); return }
    const entry = { t: new Date().toISOString(), method: req.method, url: req.url, host: req.headers.host, token: req.headers['x-auth-token'], type: req.headers['content-type'], headers: Object.keys(req.headers), body: body ? JSON.parse(body) : null }
    seen.push(entry)
    console.log(JSON.stringify(entry))
    const go = () => {
      if (mode.mode === 'redirect' && req.url === '/api/v1/sms') { res.writeHead(mode.redirectStatus || 307, mode.noLocation ? {} : { location: mode.location || 'http://sms-stub:8099/redirected-target' }); res.end(); return }
      if (mode.mode === 'hangbody') { res.writeHead(mode.status, { 'content-type': 'application/json' }); res.write('{"bulk_id":"x"'); return }
      if (mode.mode === 'bigbody') { res.writeHead(mode.status, { 'content-type': 'application/json' }); res.end('{"message":"' + 'A'.repeat(5_000_000) + '"}'); return }
      res.writeHead(mode.status, { 'content-type': 'application/json' })
      res.end(mode.status < 300 ? '{"bulk_id":"stub-1"}' : '{"message":"stub failure with secret-vendor-detail"}')
    }
    mode.delay > 0 ? setTimeout(go, mode.delay) : go()
  })
}).listen(8099, '0.0.0.0', () => console.log('aqilas stub on 8099'))
