import { z } from 'zod'
import { PACK_TOKEN, PACK_UNIT, isSafeFontRef, isSafeThemeValue } from '../css/safeValue'
import { variableDecl } from './profile'

// Only pack imports use these, so they stay out of the profile schema that every page load needs.

const packToken = z.string().refine(value => PACK_TOKEN.test(value) && isSafeThemeValue(value) && value.trim().length > 0, { error: 'plain CSS value without brackets, quotes or url' })
/** Variables a newly imported pack may declare: values that are safe to write onto the page as they are. */
export const packVariableDeclSchema = variableDecl(packToken, z.string().regex(PACK_UNIT, { error: 'unit of up to 6 lowercase letters or %' }))
/** A font an imported pack may name: a key or a plain family list (the stored profile accepts any text). */
export const packFontRefSchema = z.string({ error: 'font key or family name' }).refine(
  value => isSafeFontRef(value) && !value.startsWith('mnt-asset:'),
  { error: 'font key (serif, mono, outfit, ...) or a plain family name' },
)
