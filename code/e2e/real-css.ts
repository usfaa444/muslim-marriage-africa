import type { BrowserContext, Page } from '@playwright/test'
import { compile } from '@tailwindcss/node'

// Real Tailwind for layout checks (QA round 2, R2-1). The dev server's pages load the Tailwind CDN, which the e2e runs
// cannot reach, so the pages are unstyled there. This compiles Tailwind (the version the web app depends on) for every
// candidate token in the served HTML, inline scripts included, and serves it in place of the CDN script. The page's
// Stitch colours (its `tailwind-config` script) become theme colours, so axe's colour-contrast sees the real tokens
// (story chat-polish, Mac QA round 3). Fonts and radii stay Tailwind's defaults.

const cache = new Map<string, string>()

export async function compiledTailwind(page: Page, path: string): Promise<string> {
  const known = cache.get(path)
  if (known) return known
  const response = await page.request.get(path)
  const html = await response.text()
  const candidates = [...new Set(html.split(/[\s"'`<>=]+/).filter((token) => token.length > 0 && token.length < 80))]
  const compiler = await compile(`@import "tailwindcss";\n${stitchTheme(html)}`, { base: process.cwd(), onDependency: () => {} })
  const css = compiler.build(candidates)
  cache.set(path, css)
  return css
}

/** The `colors` of the page's Stitch `tailwind-config`, as a Tailwind 4 `@theme` block. */
export function stitchTheme(html: string): string {
  const config = /<script id="tailwind-config">([\s\S]*?)<\/script>/.exec(html)?.[1] ?? ''
  const colors = /colors:\s*\{([\s\S]*?)\}/.exec(config)?.[1] ?? ''
  const tokens = [...colors.matchAll(/"([a-z][a-z0-9-]*)":\s*"(#[0-9A-Fa-f]{3,8})"/g)].map(([, name, value]) => `--color-${name}: ${value};`)
  return tokens.length > 0 ? `@theme { ${tokens.join(' ')} }` : ''
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
