// QA scratch (outside the repo). Stands in for the three hosts this sandbox cannot reach from Chromium:
//  - cdn.tailwindcss.com: a shim for the Play CDN script. The page sets `tailwind.config = {...}` after loading
//    the script; the shim sends that exact config to this server, which compiles it with Tailwind CLI 3.4.17
//    (forms + container-queries plugins), scanning every Stitch screen and the web sources, and injects the CSS.
//  - fonts.googleapis.com / fonts.gstatic.com: a caching pass-through to the real Google Fonts through the agent proxy (curl).
import https from 'node:https'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
const SC = '/tmp/claude-0/-home-claude/6e1b1367-c24b-5f8d-8946-aab9e4dcf519/scratchpad/qa3'
const TW = `${SC}/tw3`
const CACHE = `${SC}/cdn2/cache`
const CODE = process.env.QA_CODE ?? '/home/claude/ankanu-profile-fix/code'
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
mkdirSync(CACHE, { recursive: true })
const sha = (s) => createHash('sha1').update(s).digest('hex')

function compile(cfgJson) {
  const key = sha(cfgJson + CODE)
  const out = `${CACHE}/${key}.css`
  if (existsSync(out)) return readFileSync(out)
  const cfgFile = `${TW}/cfg.${key}.cjs`
  writeFileSync(cfgFile, `const base = ${cfgJson}
module.exports = { ...base, content: ['${CODE}/design-stitch/ankanu-v2/**/*.html', '${CODE}/apps/web/src/**/*.ts', '${CODE}/apps/web/app/**/*.{ts,tsx}'], plugins: [require('@tailwindcss/forms'), require('@tailwindcss/container-queries')] }\n`)
  execFileSync(`${TW}/node_modules/.bin/tailwindcss`, ['-c', cfgFile, '-i', `${TW}/in.css`, '-o', out], { cwd: TW, stdio: 'pipe' })
  return readFileSync(out)
}

const shim = `(function(){
  var URL_='https://cdn.tailwindcss.com/__qa/css';
  function css(cfg){var x=new XMLHttpRequest();x.open('POST',URL_,false);x.send(cfg);return x.responseText}
  var style=document.createElement('style');style.setAttribute('data-qa-tailwind','1');
  (document.head||document.documentElement).appendChild(style);
  style.textContent=css('{}');
  var cfg;var t={};
  Object.defineProperty(t,'config',{get:function(){return cfg},set:function(v){cfg=v;style.textContent=css(JSON.stringify(v))}});
  window.tailwind=t;
})();`

function upstream(url, accept) {
  const key = sha(url)
  const f = `${CACHE}/up.${key}`
  if (!existsSync(f)) {
    const buf = execFileSync('curl', ['-sS', '--fail', '--max-time', '30', '-A', UA, url], { maxBuffer: 64 * 1024 * 1024 })
    writeFileSync(f, buf)
  }
  return readFileSync(f)
}

https.createServer({ key: readFileSync(`${SC}/cdn/key.pem`), cert: readFileSync(`${SC}/cdn/cert.pem`) }, (req, res) => {
  const host = (req.headers.host || '').split(':')[0]
  res.setHeader('access-control-allow-origin', '*')
  res.setHeader('access-control-allow-headers', '*')
  try {
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }
    if (host === 'cdn.tailwindcss.com') {
      if (req.url.startsWith('/__qa/css')) {
        const chunks = []
        req.on('data', (c) => chunks.push(c))
        req.on('end', () => {
          try {
            const body = Buffer.concat(chunks).toString('utf8') || '{}'
            res.writeHead(200, { 'content-type': 'text/css' }); res.end(compile(body))
          } catch (e) { console.error('compile failed', String(e.stderr || e)); res.writeHead(500); res.end(String(e)) }
        })
        return
      }
      res.writeHead(200, { 'content-type': 'application/javascript', 'cache-control': 'public, max-age=3600' }); res.end(shim); return
    }
    if (host === 'fonts.googleapis.com') {
      const buf = upstream(`https://fonts.googleapis.com${req.url}`)
      res.writeHead(200, { 'content-type': 'text/css', 'cache-control': 'private, max-age=86400' }); res.end(buf); return
    }
    if (host === 'fonts.gstatic.com') {
      const buf = upstream(`https://fonts.gstatic.com${req.url}`)
      res.writeHead(200, { 'content-type': 'font/woff2', 'cache-control': 'public, max-age=31536000' }); res.end(buf); return
    }
  } catch (e) { console.error('error', req.url, String(e)); res.writeHead(502); res.end(); return }
  res.writeHead(404); res.end()
}).listen(8443, '127.0.0.1', () => console.log('QA stub on 8443 (tailwind shim + fonts passthrough)'))
