import argon2 from 'argon2'

/** argon2id only. The plaintext password is never stored. */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id })
}

/** True only when the stored argon2id hash matches. A malformed hash is a miss. */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password)
  } catch {
    return false
  }
}
