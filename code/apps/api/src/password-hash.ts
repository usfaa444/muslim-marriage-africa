import argon2 from 'argon2'

/** argon2id only. The plaintext password is never stored. */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id })
}
