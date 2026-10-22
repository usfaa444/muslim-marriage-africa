import https from 'node:https'
import { readFileSync } from 'node:fs'
const SC = '/tmp/claude-0/-home-claude/6e1b1367-c24b-5f8d-8946-aab9e4dcf519/scratchpad/qa3'
const shim = readFileSync(`${SC}/tw3/shim.union.js`)
const fontsCss = `.material-symbols-outlined{display:inline-block;width:1.25em;height:1.25em;overflow:hidden;font-size:24px;line-height:1;white-space:nowrap;color:transparent;vertical-align:middle;direction:ltr;font-style:normal}`
https.createServer({ key: readFileSync(`${SC}/cdn/key.pem`), cert: readFileSync(`${SC}/cdn/cert.pem`) }, (req, res) => {
  const host = req.headers.host || ''
  res.setHeader('access-control-allow-origin', '*')
  if (host.startsWith('cdn.tailwindcss.com')) { res.writeHead(200, { 'content-type': 'application/javascript' }); res.end(shim); return }
  if (host.startsWith('fonts.googleapis.com')) { res.writeHead(200, { 'content-type': 'text/css' }); res.end(fontsCss); return }
  res.writeHead(404); res.end()
}).listen(8443, '127.0.0.1', () => console.log('stub CDN on 8443'))
