import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '../..')

/** Every source file reachable through static (non-type) relative imports. */
function staticGraph(entry: string): Set<string> {
  const seen = new Set<string>()
  const visit = (file: string) => {
    if (seen.has(file)) return
    seen.add(file)
    const source = readFileSync(file, 'utf8')
    for (const match of source.matchAll(/^(?:import|export)\s+(?!type\b)[^'"]*?from\s+'(\.[^']+)'|^import\s+'(\.[^']+)'/gm)) {
      const base = resolve(dirname(file), match[1] ?? match[2])
      const target = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find(existsSync)
      if (target) visit(target)
    }
  }
  visit(resolve(root, entry))
  return seen
}

describe('settings-panel modules stay free of the CSS parser', () => {
  it.each(['core/ai/merge.ts', 'core/themes/library.ts', 'core/themes/limits.ts', 'features/settings/MyThemes.tsx'])('%s does not statically load css/sanitize', entry => {
    const graph = [...staticGraph(entry)].map(file => file.slice(root.length + 1))
    expect(graph).not.toContain('core/css/sanitize.ts')
  })

  it('still finds the sanitizer behind exportThemePack', () => {
    expect([...staticGraph('core/ai/apply.ts')].map(file => file.slice(root.length + 1))).toContain('core/css/sanitize.ts')
  })
})
