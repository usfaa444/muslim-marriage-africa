import { isUuidV7 } from './id.js'

export const ROLES = Object.freeze(['member', 'mahram', 'moderator', 'operator', 'system'] as const)
export type Role = (typeof ROLES)[number]

export const GENDERS = Object.freeze(['sister', 'brother'] as const)
export type Gender = (typeof GENDERS)[number]

const STAFF_ROLES = new Set<Role>(['moderator', 'operator'])
const ALLOWED_FIELDS = new Set(['accountId', 'roles', 'gender', 'mahramWardId'])

/** Session context. `gender` is optional on the type and required when `roles` includes `member`. */
export type AuthContext = {
  accountId: string
  roles: readonly Role[]
  gender?: Gender
  mahramWardId?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function fail(message: string): never {
  throw new Error(message)
}

export function assertAuthContext(value: unknown): AuthContext {
  if (!isRecord(value)) {
    fail('AuthContext must be an object')
  }

  for (const key of Object.keys(value)) {
    if (!ALLOWED_FIELDS.has(key)) {
      fail(`AuthContext rejects ${key}`)
    }
  }

  const accountId = value.accountId
  if (typeof accountId !== 'string' || !isUuidV7(accountId)) {
    fail('AuthContext.accountId must be a UUID v7')
  }

  if (!Array.isArray(value.roles) || value.roles.length === 0) {
    fail('AuthContext.roles must list at least one role')
  }

  const roles: Role[] = []
  for (const role of value.roles) {
    if (typeof role !== 'string' || !ROLES.includes(role as Role)) {
      fail('AuthContext.roles contains an unknown role')
    }
    roles.push(role as Role)
  }

  const gender = value.gender
  if (gender !== undefined && (typeof gender !== 'string' || !GENDERS.includes(gender as Gender))) {
    fail('AuthContext.gender must be sister or brother')
  }

  if (roles.includes('member') && gender === undefined) {
    fail('AuthContext.gender is required on member sessions')
  }

  if (roles.includes('member') && roles.some((role) => STAFF_ROLES.has(role))) {
    fail('A staff session must not include member')
  }

  if (roles.includes('member') && roles.includes('mahram')) {
    fail('A mahram session must not include member')
  }

  const mahramWardId = value.mahramWardId
  if (mahramWardId !== undefined) {
    if (typeof mahramWardId !== 'string' || !isUuidV7(mahramWardId)) {
      fail('AuthContext.mahramWardId must be a UUID v7')
    }
  }

  const context: AuthContext = { accountId, roles: Object.freeze([...roles]) }
  if (gender !== undefined) {
    context.gender = gender as Gender
  }
  if (typeof mahramWardId === 'string') {
    context.mahramWardId = mahramWardId
  }
  return Object.freeze(context)
}
