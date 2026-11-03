# Hosted web app

The hosted app keeps its profile and assets in this browser's storage, separate from the extension. Export a backup from **Settings → Data** to move a profile between them. A service worker caches the app shell for offline use; when an update is ready, use the refresh prompt to activate it.

## Using your own API key

The web app can send a prompt directly from the browser to the selected provider. Requests use the provider's fixed API origin and may incur charges. The key stays in the current interface session rather than being included in profiles or backups, but it is still accessible to code running in the page and to the provider. Use a limited key, review the provider's terms, and avoid sending sensitive information in prompts.

| Provider | Browser-origin availability |
| --- | --- |
| Anthropic | The [official TypeScript SDK](https://github.com/anthropics/anthropic-sdk-typescript#browser-support) permits browser use when explicitly enabled, and Promptab sends its direct-browser access header. [Anthropic states](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#zero-data-retention-zdr-scope) that CORS is unavailable for organizations with zero data retention arrangements; those users cannot use this direct browser path. |
| OpenAI | Promptab sends requests to the OpenAI API using browser `fetch`. The [official JavaScript SDK documentation](https://developers.openai.com/api/reference/typescript) describes opting into browser use and warns about exposing API credentials, but does not guarantee CORS access for every browser origin. |

Availability can depend on the provider, account, browser, network, and origin. The automated tests use mock responses, including mock CORS preflights; they do not establish live provider availability or make paid API calls. If a provider blocks the request, use the extension or the manual copy-and-paste workflow instead.
