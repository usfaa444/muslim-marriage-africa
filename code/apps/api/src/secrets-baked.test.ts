import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url))
const codeRoot = join(repoRoot, 'code')

const imageNames = new Set([
  'Dockerfile',
  'dockerfile',
  'compose.yaml',
  'compose.yml',
  'docker-compose.yaml',
  'docker-compose.yml',
])

const skipDirs = new Set(['node_modules', 'dist', '.git', '.next'])

const defaultBucketUser = ['minio', 'admin'].join('')

const secretPatterns = [
  /AKIA[0-9A-Z]{16}/,
  new RegExp(defaultBucketUser),
  /redis:\/\/:[^@\s]+@/,
  /BEGIN (?:RSA |OPENSSH )?PRIVATE KEY/,
  /(?:REDIS_PASSWORD|S3_SECRET_ACCESS_KEY|AWS_SECRET_ACCESS_KEY|MINIO_ROOT_PASSWORD)\s*[:=]\s*['"][^'"]+['"]/,
]

function walk(dir: string, found: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) {
      continue
    }
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(path, found)
    } else {
      found.push(path)
    }
  }
}

describe('secrets are not baked in', () => {
  it('finds no image definition and no bucket key or Redis password in the tree', () => {
    const files: string[] = []
    walk(repoRoot, files)
    const images = files.filter((path) => imageNames.has(path.split('/').at(-1) ?? ''))
    expect(images).toEqual([])

    const codePrefix = `${codeRoot}/`
    const offenders: string[] = []
    for (const path of files) {
      if (!path.startsWith(codePrefix)) {
        continue
      }
      const name = path.split('/').at(-1) ?? ''
      if (!/\.(?:ts|tsx|js|mjs|json|md|ya?ml|env|example)$/.test(name)) {
        continue
      }
      const text = readFileSync(path, 'utf8')
      if (secretPatterns.some((pattern) => pattern.test(text))) {
        offenders.push(relative(repoRoot, path))
      }
    }
    expect(offenders).toEqual([])

    const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: repoRoot, encoding: 'utf8' })
      .split('\0')
      .filter((path) => path !== '')
    expect(tracked.some((path) => imageNames.has(path.split('/').at(-1) ?? ''))).toBe(false)
    expect(statSync(join(codeRoot, 'apps/api/src/object-storage-adapter.ts')).isFile()).toBe(true)
    const adapter = readFileSync(join(codeRoot, 'apps/api/src/object-storage-adapter.ts'), 'utf8')
    expect(adapter).not.toMatch(/getSignedUrl|public-read|ACL/)
    const worker = readFileSync(join(codeRoot, 'apps/api/src/redis-substrate.ts'), 'utf8')
    expect(worker).not.toMatch(/moderation_job|flag_queue/)
  })
})
