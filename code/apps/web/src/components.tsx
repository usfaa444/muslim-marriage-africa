import type { ReactNode } from 'react'

export const SAFETY_ACTIONS = ['Report', 'Blur', 'Mahram', 'Verification', 'Block', 'browse'] as const

export type SafetyAction = (typeof SAFETY_ACTIONS)[number]

const FRENCH: Record<string, string> = {
  UNAUTHENTICATED: 'Session non authentifiée.',
  FORBIDDEN: 'Accès refusé.',
  CONTACT_SHARE_REQUIRED: 'Le partage de contact est requis.',
  REVEAL_DENIED: 'Le dévoilement est refusé.',
  QUOTA_EXCEEDED: "Le plafond d'invitations est atteint.",
  MESSAGE_CAP_EXCEEDED: "Le plafond de messages est atteint. L'envoi est refusé.",
  PAY_UNAVAILABLE: 'Le paiement est indisponible.',
  IDEMPOTENCY_REPLAY: 'Cette demande a déjà été reçue.',
}

export function frenchErrorMessage(code: string): string {
  if (!Object.hasOwn(FRENCH, code)) {
    return 'Une erreur est survenue.'
  }
  return FRENCH[code] ?? 'Une erreur est survenue.'
}

/** Payment outage does not turn safety actions off. */
export function payUnavailableDisables(_action: SafetyAction): boolean {
  return false
}

export function ButtonPrimary({ children }: { children: ReactNode }): ReactNode {
  return (
    <button
      className="inline-flex items-center justify-center min-h-[48px] px-8 rounded-md bg-indigo text-ink-on-indigo font-sans font-semibold focus:outline-none focus:ring-2 focus:ring-gold-soft"
      type="button"
    >
      {children}
    </button>
  )
}

export function ButtonSecondary({ children }: { children: ReactNode }): ReactNode {
  return (
    <button
      className="inline-flex items-center justify-center min-h-[48px] px-6 rounded-md bg-raised text-indigo border border-border-strong font-sans focus:outline-none focus:ring-2 focus:ring-focus-ring"
      type="button"
    >
      {children}
    </button>
  )
}

export function ButtonQuiet({ children }: { children: ReactNode }): ReactNode {
  return (
    <button
      className="inline-flex items-center justify-center min-h-[44px] px-3 rounded-md bg-transparent text-ink-secondary font-sans focus:outline-none focus:ring-2 focus:ring-focus-ring"
      type="button"
    >
      {children}
    </button>
  )
}

export function EmptyState({ sentence, action }: { sentence: string; action: ReactNode }): ReactNode {
  return (
    <div className="empty-state bg-raised text-ink-primary rounded-md p-4">
      <p>{sentence}</p>
      {action}
    </div>
  )
}

export function ErrorBanner({ code }: { code: string }): ReactNode {
  return (
    <div className="error-banner bg-danger-soft text-danger rounded-md p-4" role="alert">
      <p>{frenchErrorMessage(code)}</p>
      <button className="min-h-[44px] underline" type="button">
        Réessayer
      </button>
    </div>
  )
}
