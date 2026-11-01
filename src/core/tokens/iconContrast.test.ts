import { expect, it } from 'vitest'
import { brandIconColor } from './iconContrast'

it('uses text colour when the brand mark misses 3:1 against the tile', () => {
  expect(brandIconColor('181717', '#18343e')).toBe('var(--mnt-text)')
})

it('keeps brand colour when it meets 3:1 against the tile', () => {
  expect(brandIconColor('181717', '#ffffff')).toBe('#181717')
})
