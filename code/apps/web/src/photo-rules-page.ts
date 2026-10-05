import { audioPromptScript, insertBeforeBody, type AudioPromptFiles } from './audio-prompt'
import { pinGuardScript } from './pin-guard'

const HOSTING_BLOCK =
  /<div class="w-full border-t border-border-hairline\/60 py-2 bg-surface-sand\/80 text-center font-caption text-caption text-ink-secondary">\s*Infrastructure de confiance hébergée souverainement · Scaleway Paris &amp; Relais Ouagadougou · Conformité CIL Burkina Faso\s*<\/div>\s*/

const DEMO_DIALOG =
  `alert("Exigences canoniques validées. Redirection vers le module de téléversement sécurisé sous chiffrement 'Sceau de Pudeur'...");`

/** Serves the photo-rules screen. The named hosting line comes off. Nothing replaces it. */
export function photoRulesPageHtml(stitchHtml: string, files: AudioPromptFiles = {}): string {
  let stripped = stitchHtml.replace(HOSTING_BLOCK, '')
  if (stripped === stitchHtml) {
    throw new Error('photo rules hosting line was not removed')
  }
  stripped = stripped.replace(DEMO_DIALOG, '')
  if (/\balert\s*\(|\bconfirm\s*\(|\bprompt\s*\(/.test(stripped)) {
    throw new Error('photo rules still contain a native dialog')
  }
  return insertBeforeBody(stripped, `${pinGuardScript()}${audioPromptScript(files)}`)
}
