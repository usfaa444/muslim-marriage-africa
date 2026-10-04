import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { authPageHtml } from '../../src/auth-page.js'

function stitchPath(): string {
  const candidates = [
    resolve(process.cwd(), '../../design-stitch/11-auth/screen.html'),
    resolve(process.cwd(), 'design-stitch/11-auth/screen.html'),
    '/app/design-stitch/11-auth/screen.html',
  ]
  for (const path of candidates) {
    try {
      readFileSync(path)
      return path
    } catch {
      // Try the next location. Dev cwd is apps/web; the image copies the file to /app.
    }
  }
  throw new Error('code/design-stitch/11-auth/screen.html is not on disk')
}

export function GET(): Response {
  const html = authPageHtml(readFileSync(stitchPath(), 'utf8'))
  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}
