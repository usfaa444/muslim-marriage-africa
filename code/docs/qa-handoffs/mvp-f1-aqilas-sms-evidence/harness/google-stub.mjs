// QA stand-in for Google reCAPTCHA siteverify (the sandbox proxy denies google.com). Always success.
import { createServer } from 'node:https'
import { readFileSync } from 'node:fs'
createServer({ key: readFileSync('/certs/key.pem'), cert: readFileSync('/certs/cert.pem') }, (req, res) => {
  let b = ''
  req.on('data', (c) => (b += c))
  req.on('end', () => {
    console.log('siteverify', req.method, req.url)
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end('{"success":true}')
  })
}).listen(443, '0.0.0.0', () => console.log('google stub on 443'))
