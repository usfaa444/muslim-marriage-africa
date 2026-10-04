import { execFile } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url))
const codeRoot = join(repoRoot, 'code')

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

describe('CI and restore contract', () => {
  it('places the five checks in the workflow GitHub Actions loads', () => {
    const workflowPath = join(repoRoot, '.github/workflows/ci.yml')
    const workflow = read(workflowPath)
    expect(workflowPath.endsWith('.github/workflows/ci.yml')).toBe(true)
    expect(workflow).toContain('pull_request:')
    expect(workflow).not.toContain('secrets.')
    expect(workflow).toContain('node-version: "24.21.0"')
    expect(workflow).toContain('working-directory: code')
    for (const name of ['oxlint:', 'types:', 'unit:', 'integration:', 'migration-check:']) {
      expect(workflow).toContain(name)
    }
    expect(workflow).toContain('name: migration check')
    expect(workflow).toContain('npm run lint')
    expect(workflow).toContain('npm run typecheck')
    expect(workflow).toContain('npm run test:unit')
    expect(workflow).toContain('npm run test:integration')
    expect(workflow).toContain('npm run migration-check')
    const packageJson = read(join(codeRoot, 'package.json'))
    expect(packageJson).toContain('"test:unit"')
    expect(packageJson).toContain('"test:integration"')
    expect(packageJson).toContain('"migration-check"')
  })

  it('keeps PITR on the one compose stack', () => {
    const compose = read(join(codeRoot, 'compose.yaml'))
    expect(compose).not.toMatch(/\b(?:dev|staging|prod)\b/i)
    const services = [...compose.matchAll(/^  ([a-z0-9-]+):\s*$/gm)].map((match) => match[1])
    expect(services).toEqual(['web', 'api', 'worker', 'postgres', 'redis', 'bucket'])
    expect(compose).toContain('wal_level=replica')
    expect(compose).toContain('archive_mode=on')
    expect(compose).toContain('/var/lib/postgresql/wal-archive/%f')
    expect(compose).toContain('./pg-data:/var/lib/postgresql/data')
    expect(compose).toContain('./pg-wal:/var/lib/postgresql/wal-archive')
    expect(compose).toContain('./pg-base:/var/lib/postgresql/basebackups')
    expect(compose).not.toMatch(/^\s*ports\s*:/m)
  })

  it('points the quarterly runbook at this environment', () => {
    const runbook = read(join(codeRoot, 'docs/restore-runbook.md'))
    expect(runbook).toContain('quarterly')
    expect(runbook).toContain('sh scripts/postgres-base-backup.sh')
    expect(runbook).toContain('sh scripts/postgres-pitr-restore.sh')
    expect(runbook).toContain('recovery_target_time')
    expect(runbook).toContain('pg_walfile_name(pg_switch_wal())')
    expect(runbook).toContain('If the names are the same')
    expect(runbook).toContain('pg_is_in_recovery()')
    expect(runbook).toContain('restoreObjectVersion')
    expect(runbook).toContain('code/compose.yaml')
    expect(runbook).not.toMatch(/\b(?:Paris|Scaleway|Île-de-France|fr-par)\b/)
    const ignore = read(join(codeRoot, '.dockerignore'))
    expect(ignore).toContain('pg-data')
    expect(ignore).toContain('pg-wal')
    expect(ignore).toContain('pg-base')
  })

  it('rejects a recovery target that is not UTC to the second', async () => {
    const script = join(codeRoot, 'scripts/postgres-pitr-restore.sh')
    const scriptText = read(script)
    expect(scriptText).toContain('pg_walfile_name(pg_switch_wal())')
    expect(scriptText).toContain('pg_is_in_recovery()')
    expect(scriptText).not.toContain('pg_isready')
    const result = await new Promise<{ code: number; stderr: string }>((resolve) => {
      execFile('sh', [script, 'not-a-time'], { encoding: 'utf8' }, (error, _stdout, stderr) => {
        if (error === null) {
          resolve({ code: 0, stderr })
          return
        }
        const code = typeof error.code === 'number' ? error.code : 1
        resolve({ code, stderr })
      })
    })
    expect(result.code).toBe(1)
    expect(result.stderr).toContain('YYYY-MM-DD HH:MM:SS+00')
  })
})
