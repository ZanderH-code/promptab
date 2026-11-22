/**
 * Manifest entries that only builds with a Google OAuth client ID receive (see vite.config.ts). A build without one
 * cannot sign in to Google, so it must not ask for `identity`: store review rejects permissions the package never uses.
 */
export const DRIVE_PERMISSIONS = ['identity']
export const DRIVE_OPTIONAL_HOSTS = ['https://www.googleapis.com/*']

type Manifest = { permissions?: string[]; optional_host_permissions?: string[] }
export function withGoogleDrive<T extends Manifest>(manifest: T): T {
  return {
    ...manifest,
    permissions: [...new Set([...(manifest.permissions ?? []), ...DRIVE_PERMISSIONS])],
    optional_host_permissions: [...new Set([...(manifest.optional_host_permissions ?? []), ...DRIVE_OPTIONAL_HOSTS])],
  }
}
