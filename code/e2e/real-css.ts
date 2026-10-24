import type { BrowserContext, Page } from '@playwright/test'
import { compile } from '@tailwindcss/node'

// Real Tailwind for layout checks (QA round 2, R2-1). The dev server's pages load the Tailwind CDN, which the e2e runs
// cannot reach, so the pages are unstyled there. This compiles Tailwind (the version the web app depends on) for every
// candidate token in the served HTML, inline scripts included, and serves it in place of the CDN script. The Stitch
// theme (custom colours and fonts) is not applied; spacing, sizing, flex and breakpoints are, which is what a layout
// measurement needs.

const cache = new Map<string, string>()

export async function compiledTailwind(page: Page, path: string): Promise<string> {
  const known = cache.get(path)
  if (known) return known
  const response = await page.request.get(path)
  const html = await response.text()
  const candidates = [...new Set(html.split(/[\s"'`<>=]+/).filter((token) => token.length > 0 && token.length < 80))]
  const compiler = await compile('@import "tailwindcss";', { base: process.cwd(), onDependency: () => {} })
  const css = compiler.build(candidates)
  cache.set(path, css)
  return css
}

/** Serves the compiled CSS as « the CDN script », which appends it `delayMs` after it runs (0: at once). */
export async function serveTailwind(context: BrowserContext, css: string, delayMs = 0): Promise<void> {
  await context.route(/^https:\/\/cdn\.tailwindcss\.com\//, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `window.tailwind = { config: {} }; setTimeout(function () { var s = document.createElement('style'); s.id = 'real-tailwind'; s.textContent = ${JSON.stringify(css)}; document.head.appendChild(s) }, ${delayMs})`,
    }),
  )
}
