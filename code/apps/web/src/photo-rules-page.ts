import { audioPromptScript, insertBeforeBody, type AudioPromptFiles } from './audio-prompt'

const HOSTING_BLOCK =
  /<div class="w-full border-t border-border-hairline\/60 py-2 bg-surface-sand\/80 text-center font-caption text-caption text-ink-secondary">\s*Infrastructure de confiance hébergée souverainement · Scaleway Paris &amp; Relais Ouagadougou · Conformité CIL Burkina Faso\s*<\/div>\s*/

/** Serves the photo-rules screen. The named hosting line comes off. Nothing replaces it. */
export function photoRulesPageHtml(stitchHtml: string, files: AudioPromptFiles = {}): string {
  const stripped = stitchHtml.replace(HOSTING_BLOCK, '')
  if (stripped === stitchHtml) {
    throw new Error('photo rules hosting line was not removed')
  }
  return insertBeforeBody(stripped, audioPromptScript(files))
}
