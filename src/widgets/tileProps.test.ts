import { expect, it } from 'vitest'
import { tileProps } from './ShortcutGridContent'

it('turns a website tile look into inline variables and data hooks', () => {
  expect(tileProps(undefined)).toEqual({ style: {}, data: {} })
  const { style, data } = tileProps({ gap: 0, hideIcon: true, opacity: 20, border: 2, rotate: 15, offsetX: -1, direction: 'horizontal', nameFirst: true, hideName: true })
  expect(style).toEqual({ '--mnt-tile-gap': '0em', '--mnt-tile-opacity': 0.2, '--mnt-tile-border': '2px', '--mnt-tile-rotate': '15deg', '--mnt-tile-x': '-1em' })
  expect(data).toEqual({ 'data-tile-direction': 'horizontal', 'data-tile-name-first': '', 'data-tile-hide-name': '', 'data-tile-hide-icon': '', 'data-tile-backdrop': '', 'data-tile-faint': '' })
  expect(tileProps({ opacity: 40 }).data).not.toHaveProperty('data-tile-faint')
})

it('puts readable text on a website whose own background plate hides the theme text', () => {
  expect(tileProps({ background: '#102932' }).style).toEqual({ '--mnt-tile-bg': '#102932', '--mnt-text': '#ffffff', '--mnt-tile-ink': '#ffffff' })
  expect(tileProps({ background: '#f5f1e8' }).style).toMatchObject({ '--mnt-text': '#000000', '--mnt-tile-ink': '#000000' })
  // Half opacity is where the plate starts to dominate the composite; below it the page colour still decides.
  expect(tileProps({ background: '#102932', opacity: 49 }).style).toEqual({ '--mnt-tile-bg': '#102932', '--mnt-tile-opacity': 0.49 })
  expect(tileProps({ background: '#102932', opacity: 50 }).style).toHaveProperty('--mnt-text', '#ffffff')
  // A visible image paints arbitrary pixels over the plate, so the label keeps the theme text.
  expect(tileProps({ background: '#102932', image: 'mnt-asset:x', imageOpacity: 80 }).style).not.toHaveProperty('--mnt-text')
  // A fully transparent image leaves the plate itself as the surface.
  expect(tileProps({ background: '#102932', image: 'mnt-asset:x', imageOpacity: 0 }).style).toHaveProperty('--mnt-text', '#ffffff')
  // No plate means the page background, where the theme's own text is already checked.
  expect(tileProps({ opacity: 90 }).style).not.toHaveProperty('--mnt-text')
})
