import { closeAccountStore } from './account-store.js'
import { createStaffAccount, disableStaffAccount, resetStaffMfa } from './staff-accounts.js'

/**
 * Staff provisioning command. Run inside the api container, never from the web:
 *
 *   node apps/api/dist/staff-cli.js create --email <email> --role moderator|operator
 *   node apps/api/dist/staff-cli.js reset-mfa --email <email>
 *   node apps/api/dist/staff-cli.js disable --email <email>
 *
 * `create` prints the one-time password once. It is not stored anywhere else and never logged.
 */

export const STAFF_CLI_USAGE = [
  'Usage:',
  '  node apps/api/dist/staff-cli.js create --email <email> --role moderator|operator',
  '  node apps/api/dist/staff-cli.js reset-mfa --email <email>',
  '  node apps/api/dist/staff-cli.js disable --email <email>',
  '',
].join('\n')

export type CliIo = {
  out: (text: string) => void
  err: (text: string) => void
}

export function parseStaffArgs(argv: readonly string[]): { command: string; email?: string; role?: string } | null {
  const [command, ...rest] = argv
  if (!command) {
    return null
  }
  const parsed: { command: string; email?: string; role?: string } = { command }
  for (let index = 0; index < rest.length; index += 1) {
    const flag = rest[index]
    const value = rest[index + 1]
    if ((flag === '--email' || flag === '--role') && value !== undefined && !value.startsWith('--')) {
      parsed[flag === '--email' ? 'email' : 'role'] = value
      index += 1
      continue
    }
    return null
  }
  return parsed
}

/** Exit code 0 on success, 1 on a refused command, 2 on bad usage. */
export async function runStaffCli(argv: readonly string[], io: CliIo): Promise<number> {
  const args = parseStaffArgs(argv)
  if (!args) {
    io.err(STAFF_CLI_USAGE)
    return 2
  }
  if (args.command === 'create') {
    if (args.role === undefined || args.email === undefined) {
      io.err(STAFF_CLI_USAGE)
      return 2
    }
    const created = await createStaffAccount({ email: args.email, role: args.role })
    if (!created.ok) {
      io.err(`${created.message}\n`)
      return 1
    }
    io.out(
      [
        `Staff account created: ${created.email} (${created.role}).`,
        `One-time password (shown once, change at first sign-in): ${created.oneTimePassword}`,
        'Sign in at /staff/connexion, then enroll an authenticator app.',
        '',
      ].join('\n'),
    )
    return 0
  }
  if (args.command === 'reset-mfa' || args.command === 'disable') {
    if (args.email === undefined || args.role !== undefined) {
      io.err(STAFF_CLI_USAGE)
      return 2
    }
    const done =
      args.command === 'reset-mfa'
        ? await resetStaffMfa({ email: args.email })
        : await disableStaffAccount({ email: args.email })
    if (!done.ok) {
      io.err(`${done.message}\n`)
      return 1
    }
    io.out(
      args.command === 'reset-mfa'
        ? 'Authenticator enrollment cleared. The next sign-in enrolls again.\n'
        : 'Staff account disabled. Its sessions have ended.\n',
    )
    return 0
  }
  io.err(STAFF_CLI_USAGE)
  return 2
}

const invokedDirectly = process.argv[1] !== undefined && /staff-cli\.(?:js|ts)$/.test(process.argv[1])

if (invokedDirectly) {
  const code = await runStaffCli(process.argv.slice(2), {
    out: (text) => process.stdout.write(text),
    err: (text) => process.stderr.write(text),
  }).catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : 'staff command failed'}\n`)
    return 1
  })
  await closeAccountStore()
  process.exit(code)
}
