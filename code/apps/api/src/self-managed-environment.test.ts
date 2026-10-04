import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url))
const codeRoot = join(repoRoot, 'code')
const skipDirs = new Set(['node_modules', 'dist', '.next', 'design-stitch', '.git', '_bmad', '_bmad-output', 'pg-data', 'pg-wal', 'pg-base'])

const locationNeedles = [
  'Données hébergées en région Île-de-France (France), prestataire Scaleway',
  'Scaleway',
  'Île-de-France',
  'Ile-de-France',
  'Hébergé en infrastructure souveraine en France',
  'Serveurs Régionaux Chiffrés',
  'fr-par',
  'Paris',
]

const stackNeedles = ['kapsule', 'opentofu']
const forbiddenSegments = new Set(['infra', 'kapsule', 'opentofu', 'tofu', 'terraform'])

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

describe('one self-managed compose environment', () => {
  it('keeps one compose stack and no isolated env modules', () => {
    const compose = readFileSync(join(codeRoot, 'compose.yaml'), 'utf8')
    expect(compose.startsWith('name: ankanu\n')).toBe(true)
    const services = [...compose.matchAll(/^  ([a-z0-9-]+):\s*$/gm)].map((match) => match[1])
    expect(services).toEqual(['web', 'api', 'worker', 'postgres', 'redis', 'bucket'])
    expect(compose).not.toMatch(/^\s*profiles\s*:/m)
    expect(compose).not.toMatch(/\b(?:dev|staging|prod)\b/i)
    const composeLower = compose.toLowerCase()
    for (const needle of [...locationNeedles, ...stackNeedles]) {
      expect(composeLower).not.toContain(needle.toLowerCase())
    }

    const files: string[] = []
    walk(repoRoot, files)
    const rel = files.map((path) => relative(repoRoot, path))
    const composeNames = new Set([
      'compose.yaml',
      'compose.yml',
      'docker-compose.yaml',
      'docker-compose.yml',
      'compose.override.yaml',
      'compose.override.yml',
    ])
    const composeFiles = rel.filter((path) => composeNames.has(path.split('/').at(-1) ?? ''))
    expect(composeFiles).toEqual(['code/compose.yaml'])

    const envSplits = rel.filter((path) => {
      const segments = path.split('/').map((segment) => segment.toLowerCase())
      return (
        segments.some((segment) => forbiddenSegments.has(segment)) ||
        /\.(?:tf|tfvars|tofu)$/.test(path) ||
        path.endsWith('.tf.json') ||
        /(?:^|\/)compose\.(dev|staging|prod)\./i.test(path) ||
        /(?:^|\/)docker-compose\.(dev|staging|prod)\./i.test(path)
      )
    })
    expect(envSplits).toEqual([])

    const sourceHits: string[] = []
    for (const path of rel) {
      const appSource =
        /^code\/(apps|packages|modules)\//.test(path) && /\.(ts|tsx)$/.test(path) && !path.includes('.test.')
      const imageFile = path === 'code/compose.yaml' || path.endsWith('/Dockerfile')
      if (!appSource && !imageFile) {
        continue
      }
      const text = readFileSync(join(repoRoot, path), 'utf8').toLowerCase()
      for (const needle of stackNeedles) {
        if (text.includes(needle)) {
          sourceHits.push(`${path}: ${needle}`)
        }
      }
    }
    expect(sourceHits).toEqual([])
  })

  it('does not print a hosting location on the public shell', () => {
    const files: string[] = []
    walk(join(codeRoot, 'apps/web/src'), files)
    walk(join(codeRoot, 'apps/web/app'), files)
    const hits: string[] = []
    for (const path of files) {
      if (!/\.(?:ts|tsx|css)$/.test(path) || path.includes('.test.')) {
        continue
      }
      const text = readFileSync(path, 'utf8').toLowerCase()
      for (const needle of locationNeedles) {
        if (text.includes(needle.toLowerCase())) {
          hits.push(`${relative(repoRoot, path)}: ${needle}`)
        }
      }
    }
    expect(hits).toEqual([])
  })
})
