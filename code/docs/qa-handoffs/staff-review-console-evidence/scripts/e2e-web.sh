cd /home/claude/ankanu-qa-review/code
export no_proxy="$no_proxy,cdn.tailwindcss.com,fonts.googleapis.com,fonts.gstatic.com,www.google.com,www.gstatic.com,www.recaptcha.net" NO_PROXY="$no_proxy"
export PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
export E2E_ALLOW_ERRORS='favicon\.ico,fonts\.googleapis\.com,fonts\.gstatic\.com'
unset E2E_BASE_URL
npx playwright test -c playwright.qa.config.ts "$@"
