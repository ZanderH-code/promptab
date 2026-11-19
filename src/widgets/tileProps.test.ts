import { expect, it } from 'vitest'
import { tileProps } from './ShortcutGridContent'

it('turns a website tile look into inline variables and data hooks', () => {
  expect(tileProps(undefined)).toEqual({ style: {}, data: {} })
  const { style, data } = tileProps({ gap: 0, hideIcon: true, opacity: 20, border: 2, rotate: 15, offsetX: -1, direction: 'horizontal', nameFirst: true, hideName: true })
  expect(style).toEqual({ '--mnt-tile-gap': '0em', '--mnt-tile-opacity': 0.2, '--mnt-tile-border': '2px', '--mnt-tile-rotate': '15deg', '--mnt-tile-x': '-1em' })
  expect(data).toEqual({ 'data-tile-direction': 'horizontal', 'data-tile-name-first': '', 'data-tile-hide-name': '', 'data-tile-hide-icon': '', 'data-tile-backdrop': '', 'data-tile-faint': '' })
  expect(tileProps({ opacity: 40 }).data).not.toHaveProperty('data-tile-faint')
})
