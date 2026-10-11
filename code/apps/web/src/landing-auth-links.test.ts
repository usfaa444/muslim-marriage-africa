import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LandingPage } from './landing.js'

describe('landing auth links', () => {
  it('sends signup calls to step 0 and login calls to the v2 sign-in screen', () => {
    const html = renderToStaticMarkup(createElement(LandingPage)).replaceAll('&#x27;', "'")
    expect(html).toContain("Commencer l'inscription")
    expect(html).toContain("Déposer mon dossier de ta'aruf")
    expect(html.match(/href="\/signup"/g)?.length).toBe(4)
    expect(html.match(/href="\/auth"/g)?.length).toBe(2)
    expect(html).not.toContain('#auth-inscription"')
    expect(html).not.toContain('mode=')
    expect(html).toContain('lg:flex-nowrap')
    expect(html).toContain('basis-full')
  })
})
