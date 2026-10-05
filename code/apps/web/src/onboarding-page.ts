import { audioPromptScript, insertBeforeBody, type AudioPromptFiles } from './audio-prompt'

/** Serves the onboarding screen. The Stitch file stays unchanged. Nothing is saved. */
export function onboardingPageHtml(stitchHtml: string, files: AudioPromptFiles = {}): string {
  return insertBeforeBody(stitchHtml, audioPromptScript(files))
}
