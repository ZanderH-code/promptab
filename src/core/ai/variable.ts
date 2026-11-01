import type { ProfileV2 } from '../schema/profile'

type Variable = ProfileV2['custom']['variables'][number]

export function variableValue(variable: Variable, value: unknown): string | number {
  if (variable.type === 'range' && typeof value === 'number' && Number.isFinite(value) && value >= variable.min && value <= variable.max) return value
  if (variable.type === 'toggle' && (value === 0 || value === 1)) return value
  if (variable.type === 'color' && typeof value === 'string' && /^#[\da-f]{6}$/i.test(value)) return value
  if (variable.type === 'select' && typeof value === 'string' && variable.options.includes(value)) return value
  return variable.default
}
