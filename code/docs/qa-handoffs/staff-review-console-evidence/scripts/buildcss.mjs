import { compile } from '/home/claude/ankanu-qa-review/code/node_modules/@tailwindcss/node/dist/index.mjs'
import { Scanner } from '/home/claude/ankanu-qa-review/code/node_modules/@tailwindcss/oxide/index.js'
import { readFileSync, writeFileSync } from 'node:fs'
const css = `@import "tailwindcss";
@theme {
 --color-deep-navy:#0B1D36; --color-soft-gold:#C9A86C; --color-cream:#F7F1E3; --color-on-navy:#F7F1E3; --color-on-cream:#0B1D36; --color-gold-soft:#E6D5A8; --color-hairline:#E2D4B8;
 --font-headline: Newsreader, Georgia, serif; --font-display: Newsreader, Georgia, serif; --font-body: "Plus Jakarta Sans", system-ui, sans-serif; --font-label: "Plus Jakarta Sans", system-ui, sans-serif;
 --radius-md: 8px; --radius-lg: .5rem; --radius-xl: .75rem;
}
`
const c = await compile(css, { base: '/home/claude/ankanu-qa-review/code', onDependency() {} })
const sc = new Scanner({ sources: [{ base: process.argv[2], pattern: '*.html', negated: false }] })
const cands = sc.scan()
writeFileSync(process.argv[3], c.build(cands))
console.log('candidates', cands.length)
