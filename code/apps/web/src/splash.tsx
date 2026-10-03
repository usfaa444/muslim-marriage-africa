'use client'

import { useEffect, useState } from 'react'

type Phase = 'checking' | 'verified'

export function SplashPage() {
  const [phase, setPhase] = useState<Phase>('checking')
  const [bar, setBar] = useState<'40' | '75' | '100'>('40')
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setBar('100')
      setPhase('verified')
      return
    }
    const mid = window.setTimeout(() => setBar('75'), 500)
    const done = window.setTimeout(() => {
      setBar('100')
      setPhase('verified')
    }, 1400)
    return () => {
      window.clearTimeout(mid)
      window.clearTimeout(done)
    }
  }, [])

  const verified = phase === 'verified'

  return (
    <div className="h-full bg-surface-sand text-ink-primary font-body antialiased selection:bg-gold-soft selection:text-indigo-deep flex flex-col justify-between courtyard-texture min-h-screen">
      <header className="w-full pt-8 pb-4 px-screen-pad">
        <div className="max-w-[760px] mx-auto flex items-center justify-between border-b border-border-hairline pb-4">
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-gold" />
            <span className="font-meta text-meta text-ink-secondary tracking-widest uppercase text-caption">
              Sanctuaire de Ta&apos;aruf & Nikah
            </span>
          </div>
          <div className="flex items-center space-x-4 text-ink-secondary">
            <span className="font-meta text-meta flex items-center gap-1 text-ink-secondary">
              <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-gold">verified_user</span>
              Ouagadougou • FR-BF
            </span>
          </div>
        </div>
      </header>
      <main className="w-full flex-grow flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[660px] bg-surface-raised border border-border-hairline rounded-xl p-8 sm:p-10 shadow-none relative">
          <div className="flex justify-center -mt-16 sm:-mt-20 mb-8">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-t-full rounded-b-xl bg-surface-indigo border-2 border-gold flex flex-col items-center justify-center shadow-sm relative">
              <div className="absolute inset-1 rounded-t-full rounded-b-[0.5rem] border border-gold/30 pointer-events-none" />
              <span aria-hidden="true" className="material-symbols-outlined text-gold text-3xl sm:text-4xl">wb_shade</span>
              <span className="font-caption text-[9px] uppercase tracking-widest text-ink-on-indigo mt-0.5 font-medium">
                Mihrab
              </span>
            </div>
          </div>
          <div className="text-center space-y-2 mb-8">
            <h1 className="font-display text-display sm:text-[32px] text-indigo font-bold tracking-tight">AnKanu</h1>
            <p className="font-meta text-meta text-secondary tracking-wider uppercase font-semibold">
              L&apos;Alliance Noble & Sincère
            </p>
            <p className="font-body text-body text-ink-secondary max-w-md mx-auto pt-1 leading-relaxed">
              Engagement matrimonial pieux sous la bienveillance des tuteurs (
              <span className="italic font-display text-indigo-deep">Wali</span>) et dans le respect inviolable des
              traditions burkinabè.
            </p>
          </div>
          <div
            className="mb-8 p-4 rounded-[0.5rem] bg-surface-sand border border-border-hairline transition-all duration-300"
            id="auth-status-container"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className={
                    verified
                      ? 'hidden relative items-center justify-center w-8 h-8 rounded-full bg-surface-raised border border-border-hairline'
                      : 'relative flex items-center justify-center w-8 h-8 rounded-full bg-surface-raised border border-border-hairline'
                  }
                  id="check-spinner"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-indigo text-lg animate-spin">progress_activity</span>
                </div>
                <div
                  className={
                    verified
                      ? 'flex items-center justify-center w-8 h-8 rounded-full bg-success-soft border border-success'
                      : 'hidden items-center justify-center w-8 h-8 rounded-full bg-success-soft border border-success'
                  }
                  id="check-success-icon"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-success text-lg">check_circle</span>
                </div>
                <div>
                  <p className="font-body-strong text-body-strong text-ink-primary" id="status-title">
                    {verified ? 'Sanctuaire vérifié & session active' : 'Vérification du sanctuaire sécurisé'}
                  </p>
                  <p className="font-meta text-meta text-ink-secondary" id="status-subtitle">
                    {verified
                      ? 'Intégrité cryptographique validée sous juridiction locale'
                      : 'Attestation du jeton de session & intégrité souveraine (≤ 2s)'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full font-caption text-caption bg-surface-variant text-ink-secondary border border-border-hairline">
                  256-bit TLS
                </span>
              </div>
            </div>
            <div className="mt-3 w-full bg-surface-variant h-1 rounded-full overflow-hidden">
              <div
                className={`bg-indigo h-full transition-all duration-1000 ease-out ${bar === '100' ? 'w-full' : bar === '75' ? 'w-3/4' : 'w-2/5'}`}
                id="vault-progress-bar"
              />
            </div>
          </div>
          <div
            className="hidden mb-8 p-4 rounded-[0.5rem] bg-danger-soft border border-danger/30 text-danger transition-all"
            id="error-alert-box"
          >
            <div className="flex items-start justify-between space-x-3">
              <div className="flex items-start space-x-2">
                <span aria-hidden="true" className="material-symbols-outlined text-danger text-xl mt-0.5">gpp_bad</span>
                <div>
                  <p className="font-body-strong text-body-strong text-danger">
                    Session non authentifiée ou tuteur requis
                  </p>
                  <p className="font-meta text-meta text-danger/90 mt-0.5">
                    Code : <code className="font-mono text-caption">UNAUTHENTICATED_SESSION</code>. Veuillez poursuivre
                    vers l&apos;étape de certification ou recommencer.
                  </p>
                </div>
              </div>
              <button
                className="font-caption text-caption uppercase tracking-wider text-danger underline hover:opacity-80 pt-1"
                type="button"
              >
                Réessayer
              </button>
            </div>
          </div>
          <div className="space-y-3 pt-2">
            <a
              className="w-full min-h-[48px] px-8 py-3 rounded-xl bg-indigo hover:bg-indigo-deep text-ink-on-indigo font-body-strong text-body-strong flex items-center justify-center space-x-2 border border-indigo-deep focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2 transition-colors duration-200"
              href="#prochaine-etape"
              id="btn-continuer"
            >
              <span>Continuer vers le sanctuaire</span>
              <span aria-hidden="true" className="material-symbols-outlined text-lg">arrow_forward</span>
            </a>
            <div className="flex items-center justify-between pt-2 px-1">
              <a
                className="font-meta text-meta text-ink-secondary hover:text-indigo flex items-center space-x-1.5 transition-colors"
                href="#charte-pudeur"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-gold">menu_book</span>
                <span>Consulter la Charte de Pudeur & Wali</span>
              </a>
              <span className="font-caption text-caption text-ink-secondary">Édition 1446H</span>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-border-hairline">
            <div className="p-3.5 rounded-[0.5rem] bg-surface-sand/70 border border-border-hairline flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-staff-soft text-staff flex items-center justify-center shrink-0 border border-border-hairline">
                <span aria-hidden="true" className="material-symbols-outlined text-base">handshake</span>
              </div>
              <p className="font-caption text-caption text-ink-secondary leading-relaxed">
                <strong className="text-ink-primary font-semibold">Médiation surveillée :</strong> Aucun échange
                n&apos;a lieu hors de la visibilité des tuteurs légaux désignés et du comité éthique consultatif.
              </p>
            </div>
          </div>
          <div
            className="mt-4 pt-3 flex items-center justify-between px-2 text-ink-secondary border-t border-border-hairline/60"
            id="pwa-install-banner"
          >
            {installed ? (
              <div className="flex items-center space-x-2 text-success py-1">
                <span aria-hidden="true" className="material-symbols-outlined text-lg">task_alt</span>
                <span className="font-meta text-meta">Raccourci PWA prêt sur votre terminal Android.</span>
              </div>
            ) : (
              <>
                <div className="flex items-center space-x-2">
                  <span aria-hidden="true" className="material-symbols-outlined text-gold text-lg">install_mobile</span>
                  <span className="font-meta text-meta text-ink-secondary">
                    Installer l&apos;application AnKanu sur votre écran d&apos;accueil
                  </span>
                </div>
                <button
                  className="px-3 py-1 rounded-full border border-border-strong text-ink-primary hover:bg-surface-sand font-meta text-caption transition-colors"
                  onClick={() => setInstalled(true)}
                  type="button"
                >
                  Installer
                </button>
              </>
            )}
          </div>
        </div>
      </main>
      <footer className="w-full bg-surface-container border-t border-secondary/20 py-8 px-screen-pad">
        <div className="max-w-[760px] mx-auto flex flex-col gap-4 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-ink-secondary">
            <div className="flex items-center space-x-2">
              <span className="font-display text-heading text-indigo font-bold">AnKanu</span>
              <span className="text-border-strong">•</span>
              <span className="font-caption text-caption text-ink-secondary">ankanu.com</span>
            </div>
            <div className="flex flex-wrap justify-center sm:justify-end gap-x-4 gap-y-1 font-body text-caption text-ink-secondary">
              <a className="hover:text-primary transition-colors" href="#charte">
                Charte Éthique & Wali
              </a>
              <a className="hover:text-primary transition-colors" href="#securite">
                Hébergement Souverain
              </a>
              <a className="hover:text-primary transition-colors" href="#deontologie">
                Conseil Consultatif Ouagadougou
              </a>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-border-hairline/60">
            <p className="font-body text-caption text-ink-secondary">
              © 2025 AnKanu. Tous droits réservés. L&apos;alliance noble et sincère, sous le regard des tuteurs et dans
              le respect des valeurs de foi.
            </p>
            <div className="shrink-0 flex items-center gap-1.5 font-meta text-caption text-secondary">
              <span className="inline-block w-2 h-2 rounded-full bg-success" />
              <span>Serveurs Régionaux Chiffrés</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
