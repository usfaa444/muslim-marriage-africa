import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { statusPageHtml } from '../../../../src/status-page'

function stitchPath(): string {
  const candidates = [
    resolve(process.cwd(), '../../design-stitch/41-delete-export-status/screen.html'),
    resolve(process.cwd(), 'design-stitch/41-delete-export-status/screen.html'),
    '/app/design-stitch/41-delete-export-status/screen.html',
  ]
  for (const path of candidates) {
    try {
      readFileSync(path)
      return path
    } catch {
      // Dev cwd is apps/web. The image copies the file to /app.
    }
  }
  throw new Error('code/design-stitch/41-delete-export-status/screen.html is not on disk')
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ ticketId: string }> },
): Promise<Response> {
  const params = await context.params
  const html = statusPageHtml(readFileSync(stitchPath(), 'utf8'), params.ticketId)
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'referrer-policy': 'no-referrer',
    },
  })
}
