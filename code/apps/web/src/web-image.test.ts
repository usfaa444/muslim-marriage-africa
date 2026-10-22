import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// The web image copies Stitch screens one by one (apps/web/Dockerfile). The web
// reads them from disk at request time, so a screen read by the source but not
// copied answers 500 in the image while every unit test, which reads the repo,
// stays green. This test ties the two lists together.

const webRoot = fileURLToPath(new URL('..', import.meta.url))
const codeRoot = fileURLToPath(new URL('../../..', import.meta.url))
const STITCH_ROOT = 'design-stitch/ankanu-v2/'

/** The only web files allowed to read design files at runtime. A new reader must be added here and parsed below. */
const READERS = ['src/discover-page.ts', 'src/v2-serve.ts']

type Source = { path: string; text: string }

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next') {
      continue
    }
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      walk(path, out)
    } else if (/\.(?:ts|tsx|mjs|js)$/.test(name) && !/\.test\.tsx?$/.test(name) && !name.endsWith('.d.ts')) {
      out.push(path)
    }
  }
}

function runtimeSources(): Source[] {
  const files: string[] = []
  walk(join(webRoot, 'src'), files)
  walk(join(webRoot, 'app'), files)
  for (const name of ['middleware.ts', 'next.config.ts']) {
    files.push(join(webRoot, name))
  }
  return files.map((path) => ({ path: relative(webRoot, path), text: readFileSync(path, 'utf8') }))
}

/** Every Stitch file the web source reads, as `<screen>/<file>`. Throws on a call whose name is not a literal. */
function stitchReads(sources: Source[]): string[] {
  const reads = new Set<string>()
  for (const source of sources) {
    const calls = [...source.text.matchAll(/\b(stitchFile|loadStitch)\(/g)].filter(
      (match) => !/function\s+$/.test(source.text.slice(Math.max(0, (match.index ?? 0) - 12), match.index)),
    )
    let literal = 0
    for (const match of source.text.matchAll(/\bstitchFile\(\s*'([^'\\]+)'\s*(?:,\s*'([^'\\]+)'\s*)?\)/g)) {
      reads.add(`${match[1]}/${match[2] ?? 'screen.html'}`)
      literal += 1
    }
    for (const match of source.text.matchAll(/\bloadStitch\(\s*'([^'\\]+)'\s*\)/g)) {
      reads.add(match[1] ?? '')
      literal += 1
    }
    if (literal !== calls.length) {
      throw new Error(`${source.path}: a stitchFile/loadStitch call does not name its file with a string literal`)
    }
  }
  return [...reads].sort()
}

/** Every Stitch path the Dockerfile copies into the runtime image, as `<screen>/<file>` (or a whole `<screen>`). */
function dockerCopies(dockerfile: string): string[] {
  const copies: string[] = []
  for (const line of dockerfile.split('\n')) {
    const match = /^COPY\s+--from=build\s+\/app\/(\S+)\s+(\S+)\s*$/.exec(line.trim())
    if (!match || !match[1]?.startsWith(STITCH_ROOT)) {
      continue
    }
    if (match[2] !== match[1]) {
      throw new Error(`Dockerfile copies ${match[1]} to ${match[2]}; the web looks for it at /app/${match[1]}`)
    }
    copies.push(match[1].slice(STITCH_ROOT.length).replace(/\/$/, ''))
  }
  return copies.sort()
}

function covered(read: string, copies: string[]): boolean {
  return copies.some((copy) => copy === read || read.startsWith(`${copy}/`))
}

function dockerfile(): string {
  return readFileSync(join(webRoot, 'Dockerfile'), 'utf8')
}

describe('web image design files', () => {
  it('finds the screens the web reads, including the review, discover grid and filter screens', () => {
    const reads = stitchReads(runtimeSources())
    expect(reads).toContain('12-profile-not-yet-public/screen.html')
    expect(reads).toContain('57-discover/grid.html')
    expect(reads).toContain('13-search/screen.html')
    expect(reads).toContain('14-filters/screen.html')
    expect(reads).toContain('11-profile-edit/screen.html')
  })

  it('copies every Stitch file the web reads at runtime into the image', () => {
    const copies = dockerCopies(dockerfile())
    const missing = stitchReads(runtimeSources()).filter((read) => !covered(read, copies))
    expect(missing).toEqual([])
  })

  it('copies only Stitch files that exist and that the web still reads', () => {
    const reads = stitchReads(runtimeSources())
    const copies = dockerCopies(dockerfile())
    expect(copies.filter((copy) => !existsSync(join(codeRoot, STITCH_ROOT, copy)))).toEqual([])
    expect(copies.filter((copy) => !reads.some((read) => covered(read, [copy])))).toEqual([])
  })

  it('reads design files only through the two parsed loaders', () => {
    const readers = runtimeSources()
      .filter((source) => source.text.includes('design-stitch') || /\breadFileSync\b|\breadFile\b/.test(source.text))
      .map((source) => source.path.replaceAll('\\', '/'))
      .sort()
    expect(readers).toEqual(READERS)
  })

  it('rejects a non-literal screen name and a copy to another path', () => {
    expect(() => stitchReads([{ path: 'x.ts', text: "stitchFile(name)\nstitchFile('02-auth')" }])).toThrow(/string literal/)
    expect(stitchReads([{ path: 'x.ts', text: "function stitchFile(folder: string) {}\nstitchFile('02-auth')" }])).toEqual([
      '02-auth/screen.html',
    ])
    expect(() =>
      dockerCopies('COPY --from=build /app/design-stitch/ankanu-v2/02-auth/screen.html screens/02-auth/screen.html'),
    ).toThrow(/looks for it/)
    const old = 'COPY --from=build /app/design-stitch/ankanu-v2/02-auth/screen.html design-stitch/ankanu-v2/02-auth/screen.html'
    expect(dockerCopies(old)).toEqual(['02-auth/screen.html'])
    expect(covered('12-profile-not-yet-public/screen.html', dockerCopies(old))).toBe(false)
  })
})
