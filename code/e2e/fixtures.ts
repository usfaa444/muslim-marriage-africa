import AxeBuilder from '@axe-core/playwright'
import { test as base, expect, type Page } from '@playwright/test'
import { knownIssue } from './known-issues'

export const WIDTHS = [360, 390, 768, 1024, 1280, 1440] as const

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

type Guards = { consoleErrors: string[]; failedRequests: string[] }

// Every test fails on a console error, a page error, a failed request, or a 5xx,
// unless it matches an entry in known-issues.ts. A test that expects an error
// clears `guards.consoleErrors` or `guards.failedRequests` after that step.
export const test = base.extend<{ guards: Guards }>({
  guards: [
    async ({ page }, use, testInfo) => {
      const guards: Guards = { consoleErrors: [], failedRequests: [] }
      const record = (list: string[], text: string) => {
        const known = knownIssue(text)
        if (known) testInfo.annotations.push({ type: 'known-issue', description: `${known.reason} (${text})` })
        else list.push(text)
      }
      page.on('console', (message) => {
        if (message.type() === 'error') record(guards.consoleErrors, `${message.text()} ${message.location().url}`.trim())
      })
      page.on('pageerror', (error) => record(guards.consoleErrors, error.message))
      page.on('requestfailed', (request) => {
        record(guards.failedRequests, `${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`.trim())
      })
      page.on('response', (response) => {
        if (response.status() >= 500) record(guards.failedRequests, `${response.status()} ${response.url()}`)
      })
      await use(guards)
      expect(guards.consoleErrors, 'console errors').toEqual([])
      expect(guards.failedRequests, 'failed requests').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }

// Zero serious or critical WCAG 2.2 AA violations. Minor and moderate ones are
// returned so a QA report can list them.
export async function expectAccessible(page: Page, exclude: string[] = []) {
  let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS)
  for (const selector of exclude) builder = builder.exclude(selector)
  const { violations } = await builder.analyze()
  const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(
    blocking.flatMap((v) =>
      v.nodes.map((node) => `${v.impact} ${v.id} at ${node.target.join(' ')}: ${node.any[0]?.message ?? v.help}`),
    ),
    'serious or critical accessibility violations',
  ).toEqual([])
  return violations
}

export async function expectNoHorizontalOverflow(page: Page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(scrollWidth, `scrollWidth ${scrollWidth} > innerWidth ${innerWidth}`).toBeLessThanOrEqual(innerWidth)
}
