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

const skipDirs = new Set(['node_modules', 'dist', '.git', '.next', 'pg-data', 'pg-wal', 'pg-base'])

const defaultBucketUser = ['minio', 'admin'].join('')

const secretPatterns = [
  /AKIA[0-9A-Z]{16}/,
  new RegExp(defaultBucketUser),
  /redis:\/\/:[^@\s]+@/,
  /BEGIN (?:RSA |OPENSSH )?PRIVATE KEY/,
  /(?:REDIS_PASSWORD|S3_SECRET_ACCESS_KEY|AWS_SECRET_ACCESS_KEY|MINIO_ROOT_PASSWORD)\s*[:=]\s*['"](?!\$\{)[^'"]+['"]/,
]

const imageSecretKeys =
  'POSTGRES_PASSWORD|REDIS_PASSWORD|S3_ACCESS_KEY_ID|S3_SECRET_ACCESS_KEY|AWS_SECRET_ACCESS_KEY|MINIO_ROOT_USER|MINIO_ROOT_PASSWORD'

const imageLiteralPatterns = [
  new RegExp(
    `(?:${imageSecretKeys})\\s*[:=]\\s*(?:(['"])(?!\\$\\{)[^'"]+\\1|(?!['"$\\s])\\S+)`,
  ),
  new RegExp(
    `(?:^|\\n)\\s*(?:ENV|ARG)\\s+(?:${imageSecretKeys})\\s+(?:(['"])(?!\\$\\{)[^'"]+\\1|(?!['"$\\s])\\S+)`,
  ),
  new RegExp(`\\$\\{(?:${imageSecretKeys})[:-]`),
  /postgres:\/\/[^:\s@]+:[^:\s@]+@/,
]

const allowedImageFiles = [
  'code/apps/api/Dockerfile',
  'code/apps/web/Dockerfile',
  'code/compose.yaml',
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
  it('allows code image files and still rejects baked secrets', () => {
    const files: string[] = []
    walk(repoRoot, files)
    const images = files.filter((path) => imageNames.has(path.split('/').at(-1) ?? ''))
    expect(images.map((path) => relative(repoRoot, path)).sort()).toEqual([...allowedImageFiles].sort())

    const codePrefix = `${codeRoot}/`
    const offenders: string[] = []
    for (const path of files) {
      if (!path.startsWith(codePrefix)) {
        continue
      }
      const name = path.split('/').at(-1) ?? ''
      const isImage = imageNames.has(name)
      const isText = /\.(?:ts|tsx|js|mjs|json|md|ya?ml|env|example)$/.test(name) || name === '.dockerignore'
      if (!isImage && !isText) {
        continue
      }
      const text = readFileSync(path, 'utf8')
      const patterns = isImage ? [...secretPatterns, ...imageLiteralPatterns] : secretPatterns
      if (patterns.some((pattern) => pattern.test(text))) {
        offenders.push(relative(repoRoot, path))
      }
    }
    expect(offenders).toEqual([])
    const literal = ['S3', '_SECRET_ACCESS_KEY: ', 'hunter', '2'].join('')
    const quotedLiteral = ['MINIO', '_ROOT_PASSWORD: "', 'hunter', '2"'].join('')
    const quotedRef = ['MINIO', '_ROOT_PASSWORD: "', '${', 'S3_SECRET_ACCESS_KEY}"'].join('')
    const interpolation = ['S3', '_SECRET_ACCESS_KEY: ${', 'S3_SECRET_ACCESS_KEY}'].join('')
    const databaseUrlLiteral = ['DATABASE_URL: postgres://ankanu:', 'hunter', '2@postgres:5432/ankanu'].join('')
    const databaseUrlOpen = 'postgres://ankanu@postgres:5432/ankanu'
    const dockerfileSpace = ['ENV S3', '_SECRET_ACCESS_KEY ', 'hunter', '2'].join('')
    const minioDefault = ['MINIO', '_ROOT_PASSWORD: ${', 'MINIO_ROOT_PASSWORD-', 'hunter', '2}'].join('')
    const awsDefault = ['AWS', '_SECRET_ACCESS_KEY: ${', 'AWS_SECRET_ACCESS_KEY-', 'secret}'].join('')
    const quotedInterpolation = ['"', '${', 'S3_SECRET_ACCESS_KEY}"'].join('')
    expect(imageLiteralPatterns.some((pattern) => pattern.test(literal))).toBe(true)
    expect(imageLiteralPatterns.some((pattern) => pattern.test(interpolation))).toBe(false)
    expect(imageLiteralPatterns.some((pattern) => pattern.test(databaseUrlLiteral))).toBe(true)
    expect(imageLiteralPatterns.some((pattern) => pattern.test(databaseUrlOpen))).toBe(false)
    expect(imageLiteralPatterns.some((pattern) => pattern.test(dockerfileSpace))).toBe(true)
    expect(imageLiteralPatterns.some((pattern) => pattern.test(minioDefault))).toBe(true)
    expect(imageLiteralPatterns.some((pattern) => pattern.test(awsDefault))).toBe(true)
    expect(imageLiteralPatterns.some((pattern) => pattern.test(quotedInterpolation))).toBe(false)
    expect(secretPatterns.some((pattern) => pattern.test(quotedLiteral))).toBe(true)
    expect(secretPatterns.some((pattern) => pattern.test(quotedRef))).toBe(false)
    expect(secretPatterns.some((pattern) => pattern.test(quotedInterpolation))).toBe(false)

    const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: repoRoot, encoding: 'utf8' })
      .split('\0')
      .filter((path) => path !== '')
    const trackedImages = tracked.filter((path) => imageNames.has(path.split('/').at(-1) ?? ''))
    expect(trackedImages.filter((path) => !path.startsWith('code/'))).toEqual([])
    expect(statSync(join(codeRoot, 'apps/api/src/object-storage-adapter.ts')).isFile()).toBe(true)
    const adapter = readFileSync(join(codeRoot, 'apps/api/src/object-storage-adapter.ts'), 'utf8')
    expect(adapter).not.toMatch(/getSignedUrl|public-read|ACL/)
    const worker = readFileSync(join(codeRoot, 'apps/api/src/redis-substrate.ts'), 'utf8')
    expect(worker).not.toMatch(/moderation_job|flag_queue/)
  })
})
