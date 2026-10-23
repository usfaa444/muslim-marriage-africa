import { navLabel, withAppShell, type NavSection } from './app-shell'
import { pinGuardScript } from './pin-guard'
import { prepareV2 } from './v2-document'

export type SectionPlaceholder = Extract<NavSection, 'invitations' | 'discussions'>

/**
 * `/invitations` and `/discussions` for a live member session until their own screens ship (screens 19 and 20).
 * Only the shared shell and the section's nav label, so the bottom nav never leads to a raw JSON error.
 */
export function memberSectionHtml(headSource: string, section: SectionPlaceholder): string {
  const label = navLabel(section)
  const headEnd = headSource.indexOf('</head>')
  const head = (headEnd < 0 ? '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">' : headSource.slice(0, headEnd)).replace(
    /<title>[\s\S]*?<\/title>/,
    `<title>AnKanu - ${label}</title>`,
  )
  const body = `<body data-member-section="${section}" class="min-h-full bg-cream text-deep-navy font-body flex flex-col antialiased">
<main class="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-8 flex flex-col gap-6 min-w-0">
<div class="flex flex-col gap-1 border-b border-hairline/60 pb-4">
<h1 class="font-display text-2xl sm:text-3xl text-deep-navy font-normal tracking-tight break-words">${label}</h1>
</div>
</main>
</body></html>`
  const page = prepareV2(withAppShell(`${head}</head>${body}`, { kind: 'member', active: section }), '')
  const guard = pinGuardScript()
  return page.includes('</body>') ? page.replace('</body>', `${guard}</body>`) : `${page}${guard}`
}
