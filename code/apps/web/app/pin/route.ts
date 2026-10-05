import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pinPageHtml } from '../../src/pin-page'

function stitchPath(): string {
  const candidates = [
    resolve(process.cwd(), '../../design-stitch/19-pin-lock/screen.html'),
    resolve(process.cwd(), 'design-stitch/19-pin-lock/screen.html'),
    '/app/design-stitch/19-pin-lock/screen.html',
  ]
  for (const path of candidates) {
    try {
      readFileSync(path)
      return path
    } catch {
      // Dev cwd is apps/web. The image copies the file to /app.
    }
  }
  throw new Error('code/design-stitch/19-pin-lock/screen.html is not on disk')
}

export function GET(): Response {
  const html = pinPageHtml(readFileSync(stitchPath(), 'utf8'))
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'referrer-policy': 'no-referrer',
    },
  })
}
