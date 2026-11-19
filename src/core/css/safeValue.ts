/**
 * Checks for theme values written onto <html> as custom properties. Those values never pass the CSS
 * sanitizer but sanitized CSS can read them through var(), so they must not be able to carry a function
 * (url(), image-set()), a string, an escape or the end of a declaration.
 */

/** Rejected anywhere in a theme variable value; `url` also catches names a parser might still treat as one. */
const UNSAFE_THEME_VALUE = /[()"'\\;{}\p{Cc}]|url/iu
/** A font-family list of plain names: letters, digits, spaces, commas, quotes, dots, underscores and hyphens. */
const FONT_REF = /^[\p{L}\p{N} ,"'._-]+$/u

export const isSafeThemeValue = (value: string) => !UNSAFE_THEME_VALUE.test(value)

export const isSafeFontRef = (value: string) => FONT_REF.test(value) && value.trim().length > 0

/** Select options and defaults an imported pack may declare: one or more plain CSS tokens. */
export const PACK_TOKEN = /^[\p{L}\p{N} #%.,/+*_-]+$/u
/** Units an imported pack's range variable may append to its number. */
export const PACK_UNIT = /^[a-z%]{0,6}$/
