/** `table[key]` for lookup tables keyed by outside input, ignoring inherited keys such as `constructor` or `__proto__`. */
export const own = <T>(table: Readonly<Record<string, T>>, key: string): T | undefined => Object.hasOwn(table, key) ? table[key] : undefined
