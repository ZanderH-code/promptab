export type BrandCatalogueEntry = { slug?: string; title?: string; source?: string }
export type BrandIndexOverrides = {
  suffixes: string[]
  hosts?: Record<string, string>
  paths?: Record<string, string>
  ignore?: string[]
}
export type BuiltBrandIndex = {
  version: number
  hosts: Record<string, string>
  paths: Record<string, string>
  labels: Record<string, string>
  ignore: string[]
}

export function registrableDomain(host: string, suffixes: string[]): string
export function registrableLabel(host: string, suffixes: string[]): string
export function buildBrandIndex(
  catalogue: Record<string, BrandCatalogueEntry>,
  overrides: BrandIndexOverrides,
  options?: { deniedHosts?: Set<string>; deniedSuffixes?: string[] },
): BuiltBrandIndex
export function buildIndexFromInstalledIcons(overridesPath?: string): Promise<BuiltBrandIndex>
export function writeBrandIndex(outputDir?: string): Promise<{
  target: string
  bytes: number
  hosts: number
  paths: number
  labels: number
}>
