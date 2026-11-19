// @types/css-tree only describes the package root. These subpaths export the same functions without the
// lexer and its syntax data, which Promptab never uses (see package.json "exports" of css-tree).
declare module 'css-tree/parser' {
  const parse: typeof import('css-tree').parse
  export default parse
}
declare module 'css-tree/generator' {
  const generate: typeof import('css-tree').generate
  export default generate
}
declare module 'css-tree/walker' {
  const walk: typeof import('css-tree').walk
  export default walk
}
declare module 'css-tree/tokenizer' {
  export const tokenize: typeof import('css-tree').tokenize
  export const tokenTypes: typeof import('css-tree').tokenTypes
}
