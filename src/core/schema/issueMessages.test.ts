import { describe, expect, it } from 'vitest'
import { localizeIssue, schemaExpectation } from './issueMessages'

describe('schema issue messages', () => {
  it('maps known Zod expectations to a stable key and parameters', () => {
    expect(schemaExpectation('number 0-28')).toEqual({ key: 'range', params: { kind: 'number', min: 0, max: 28 } })
    expect(schemaExpectation('integer 40-120')).toEqual({ key: 'range', params: { kind: 'integer', min: 40, max: 120 } })
    expect(schemaExpectation('gradient required for gradient background')).toEqual({ key: 'gradient-required' })
  })

  it('localizes expected text while preserving path, value and issue count', () => {
    const issues = [
      { path: 'theme.radius', expected: 'number 0-28', value: '99' },
      { path: 'background.gradient', expected: 'gradient required for gradient background', value: 'undefined' },
    ]
    const chinese = issues.map(issue => localizeIssue(issue, 'zh-CN'))
    expect(chinese).toHaveLength(issues.length)
    expect(chinese.map(issue => ({ path: issue.path, value: issue.value }))).toEqual(issues.map(issue => ({ path: issue.path, value: issue.value })))
    expect(chinese[0].expected).toBe('数字 0-28')
    expect(chinese[1].expected).toBe('渐变背景需要 gradient 字段')
  })

  it('leaves unknown expectations unchanged', () => {
    expect(localizeIssue({ path: '$', expected: 'some future rule', value: 'x' }, 'zh-CN').expected).toBe('some future rule')
  })
})
