# Phase 2 design: reading page-declared icons

Status: design only. This phase does not add manifest permissions, change CSP, or make requests.

## Scope

Phase 1 tries only same-origin conventional icon paths and Chromium's built-in `/_favicon` endpoint. A future phase could inspect the bookmarked page's `<link rel="icon">`, `apple-touch-icon` declarations, and web app manifest `icons` entries. This may find high-resolution or nonstandard icon URLs that path guessing misses.

## Permissions and request timing

- Fetching arbitrary bookmarked pages from an extension page requires host access. A possible manifest declaration is `optional_host_permissions: ["https://*/*"]`; request only the specific HTTPS origins the user chooses, at the point they explicitly enable page-declared icons or retry a bookmark. Do not prompt when a bookmark is added or when a new tab opens.
- Read the page document and any manifest only after permission is granted. Validate redirects and every discovered icon URL. The initial design should restrict image sources to the authorized bookmark origin; supporting a CDN would need a separate permission and privacy decision.
- `optional_host_permissions` does not itself guarantee fetch access. The extension page CSP may need a narrowly scoped `connect-src https:` directive, and Firefox permission behavior must be checked. Any manifest or CSP change requires a separate implementation review.
- Use `credentials: "omit"`, `referrerPolicy: "no-referrer"`, a short timeout, bounded response size, and a small request concurrency limit. Parse HTML and JSON as data only; never execute returned scripts. Display SVG only through `<img>`.

## Privacy and user controls

- A fetch sends the bookmarked origin the user's network address and reveals that the user opened the new-tab feature. It must not send cookies, authorization headers, or a referrer, and must not contact a third-party icon service.
- Explain the request and its scope before asking for permission. Provide a per-origin permission/retry control and a way to clear cached icon metadata. Keep the cache in the separate `mnt.iconCache:v1` key, with a bounded size and expiration; never include it in profiles, backups, export, or sync.
- Permission denial must leave Phase 1 behavior intact and must not alter manually selected icons.
- Before release, update the privacy policy and store disclosures, test permission removal and revocation, and complete the store review process. Release timing must account for the current 0.11.0 review.

## Limits

A permission does not guarantee that HTML can be read or that a referenced image can be displayed. A site may return a Cloudflare or other bot challenge (as observed for `https://claude.ai/new`), require login, block extension requests, redirect across origins, or send restrictive response headers such as `Cross-Origin-Resource-Policy: same-origin`. A host permission cannot make a server return the intended page or override its response policy. The implementation would need to report those cases and continue to the Phase 1 candidates.

## Decision required before implementation

The user must choose whether to request per-origin access and approve the permission, privacy, CSP, cache, and store-review changes. Until then, this remains a design document only.
