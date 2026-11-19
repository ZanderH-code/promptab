/** The first user-visible character of `text` (whole code point, so "🎵 Music" gives "🎵", not half of it). */
export const firstChar = (text: string): string => Array.from(text.trim())[0] ?? ''

/** `text` cut to at most `max` UTF-16 units without leaving half of a surrogate pair at the end. */
export function clipText(text: string, max: number): string {
  if (text.length <= max) return text
  const end = text.charCodeAt(max - 1)
  return text.slice(0, end >= 0xd800 && end <= 0xdbff ? max - 1 : max)
}
