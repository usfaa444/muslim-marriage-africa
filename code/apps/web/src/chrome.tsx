import type { ReactNode } from 'react'

export type ShellName = 'public' | 'member' | 'mahram' | 'staff'

/** One session kind maps to one shell. Staff never becomes member. */
export function shellForKind(kind: string | null): ShellName {
  if (kind === 'staff') {
    return 'staff'
  }
  if (kind === 'mahram') {
    return 'mahram'
  }
  if (kind === 'web' || kind === 'capacitor') {
    return 'member'
  }
  return 'public'
}

export function MemberChrome(): ReactNode {
  return (
    <nav aria-label="Membre" data-shell="member">
      <a href="/decouvrir">Découvrir</a>
      <a href="/invitations">Invitations</a>
      <a href="/discussions">Discussions</a>
      <a href="/profil">Profil</a>
    </nav>
  )
}

export function MahramChrome(): ReactNode {
  return (
    <nav aria-label="Mahram" data-shell="mahram">
      <a href="/discussions">Discussions</a>
      <a href="/profil">Profil</a>
    </nav>
  )
}

export function StaffChrome(): ReactNode {
  return (
    <div aria-label="Équipe" data-shell="staff">
      <p className="inline-block bg-staff text-raised rounded-sm px-2 py-1 text-xs">Équipe seulement</p>
      <div className="grid grid-cols-1 md:grid-cols-2" />
    </div>
  )
}

export function RoleChrome({ kind }: { kind: string | null }): ReactNode {
  const shell = shellForKind(kind)
  if (shell === 'member') {
    return <MemberChrome />
  }
  if (shell === 'mahram') {
    return <MahramChrome />
  }
  if (shell === 'staff') {
    return <StaffChrome />
  }
  return null
}
