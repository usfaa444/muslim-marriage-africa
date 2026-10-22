import { defineConfig, devices } from '@playwright/test'

// E2E_BASE_URL points the suite at a running environment (for example staging).
// Without it, Playwright starts the web app locally on port 3100.
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3100'
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/.results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never', outputFolder: 'e2e/.report' }]] : 'list',
  use: {
    baseURL,
    locale: 'fr-FR',
    timezoneId: 'Africa/Ouagadougou',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: process.env.CI ? 'retain-on-failure' : 'off',
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 360, height: 780 } } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? []
    : {
        command: 'npx tsc -p packages/kernel/tsconfig.json && npm run dev -w @ankanu/web -- -p 3100',
        url: 'http://localhost:3100/',
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
})
