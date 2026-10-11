const PUBLIC_ORIGIN = 'ANKANU_PUBLIC_ORIGIN'
const ALLOWED_ORIGINS = 'ANKANU_ALLOWED_ORIGINS'

/** An origin only: http(s), no userinfo, no path, no query, no hash. */
export function strictOrigin(value: string): string | null {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return null
  }
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return null
  }
  if (url.username !== '' || url.password !== '') {
    return null
  }
  if (url.pathname !== '/' || url.search !== '' || url.hash !== '') {
    return null
  }
  return url.origin
}

/** Verification, change-email, and password-reset links use only this value. */
export function configuredPublicOrigin(env: NodeJS.ProcessEnv = process.env): string | null {
  const raw = env[PUBLIC_ORIGIN]
  if (raw === undefined || raw.trim() === '') {
    return null
  }
  return strictOrigin(raw)
}

/** Empty means the Origin check is off. A non-empty value must be a comma-separated origin list. */
export function parseAllowedOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const raw = env[ALLOWED_ORIGINS]
  if (raw === undefined || raw.trim() === '') {
    return []
  }
  const items: string[] = []
  for (const part of raw.split(',')) {
    const origin = strictOrigin(part)
    if (!origin) {
      throw new Error('ANKANU_ALLOWED_ORIGINS contains an invalid origin')
    }
    items.push(origin)
  }
  return items
}

/** The image always runs with NODE_ENV=production, including this host. */
export function assertPublicOriginBoot(env: NodeJS.ProcessEnv = process.env): void {
  if (env.NODE_ENV !== 'production') {
    if (env[ALLOWED_ORIGINS] !== undefined && env[ALLOWED_ORIGINS].trim() !== '') {
      parseAllowedOrigins(env)
    }
    return
  }
  if (!configuredPublicOrigin(env)) {
    throw new Error('ANKANU_PUBLIC_ORIGIN must be an http(s) origin in production')
  }
  const allowed = env[ALLOWED_ORIGINS]
  if (allowed === undefined || allowed.trim() === '') {
    throw new Error('ANKANU_ALLOWED_ORIGINS must list at least one origin in production')
  }
  parseAllowedOrigins(env)
}
