import { resolve } from 'node:path'
import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')
const eslint = new ESLint({ cwd: root })

async function lintSnippet(code: string, relativePath: string) {
  const [result] = await eslint.lintText(code, { filePath: resolve(root, relativePath) })
  return result.messages.filter(message => message.severity === 2)
}

describe('ESLint architectural and safety guardrails', () => {
  it('bans explicit any in product code', async () => {
    const errors = await lintSnippet('export function parse(input: any) { return input }\n', 'src/core/sample.ts')
    expect(errors.some(error => error.ruleId === '@typescript-eslint/no-explicit-any')).toBe(true)
  })

  it('bans indirect extensionApi().storage / .bookmarks access so store scans see literal chrome.*', async () => {
    const code =
      "import { extensionApi } from '../platform/extension'\nexport const s = extensionApi()?.storage?.local\n"
    const errors = await lintSnippet(code, 'src/storage/sample.ts')
    expect(
      errors.some(error => error.ruleId === 'no-restricted-syntax' && error.message.includes('extensionStorage()')),
    ).toBe(true)
  })

  it('bans direct fetch() outside reviewed network/asset modules', async () => {
    const errors = await lintSnippet(
      "export async function leak() { return fetch('https://example.com') }\n",
      'src/features/settings/Sample.tsx',
    )
    expect(
      errors.some(error => error.ruleId === 'no-restricted-globals' && error.message.includes('zero-telemetry')),
    ).toBe(true)
  })

  it('forbids src/core/ modules from importing UI/app layers or new platform/storage modules', async () => {
    const uiErrors = await lintSnippet(
      "import { x } from '../features/settings/rows'\nexport const y = x\n",
      'src/core/sample.ts',
    )
    expect(
      uiErrors.some(error => error.ruleId === 'no-restricted-imports' && error.message.includes('UI, store, or app')),
    ).toBe(true)

    const ioErrors = await lintSnippet(
      "import { extensionStorage } from '../platform/extension'\nexport const s = extensionStorage\n",
      'src/core/newPureModule.ts',
    )
    expect(
      ioErrors.some(error => error.ruleId === 'no-restricted-imports' && error.message.includes('must stay pure')),
    ).toBe(true)
  })

  it('forbids new lower-layer modules from importing src/app/', async () => {
    const errors = await lintSnippet(
      "import { assets } from '../../app/useSettings'\nexport const a = assets\n",
      'src/features/settings/NewPanel.tsx',
    )
    expect(errors.some(error => error.ruleId === 'no-restricted-imports' && error.message.includes('src/app/'))).toBe(
      true,
    )
  })

  it('forbids new src unit tests from reading source files via node:fs', async () => {
    const errors = await lintSnippet(
      "import { readFileSync } from 'node:fs'\nexport const raw = readFileSync('src/app/App.tsx', 'utf8')\n",
      'src/features/settings/ChangeDetector.test.ts',
    )
    expect(
      errors.some(error => error.ruleId === 'no-restricted-imports' && error.message.includes('change detectors')),
    ).toBe(true)
  })

  it('accepts clean product code that obeys boundaries', async () => {
    const errors = await lintSnippet(
      "import { extensionStorage } from '../platform/extension'\nexport const readLocal = () => extensionStorage()?.local\n",
      'src/storage/cleanSample.ts',
    )
    expect(errors).toEqual([])
  })
})
