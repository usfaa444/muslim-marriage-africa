import https from 'node:https'
import { readFileSync } from 'node:fs'
const S = process.env.QAS
const tw = readFileSync(S + '/tw.css', 'utf8') + '\n.material-symbols-outlined{display:inline-block;width:1em;height:1em;overflow:hidden;font-size:24px;line-height:1}'
https.createServer({ key: readFileSync(S + '/k.pem'), cert: readFileSync(S + '/c.pem') }, (req, res) => {
  const h = req.headers.host
  if (/tailwind/.test(h)) { res.setHeader('content-type', 'application/javascript'); res.end(`window.tailwind={};(function(){var s=document.createElement('style');s.textContent=${JSON.stringify(tw)};document.head.appendChild(s)})()`) }
  else if (/fonts/.test(h)) { res.setHeader('content-type', 'text/css'); res.end('') }
  else { res.setHeader('content-type', 'application/javascript'); res.end('window.grecaptcha={};') }
}).listen(443, '127.0.0.1', () => console.log('standin up'))
