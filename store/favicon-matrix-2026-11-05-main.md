# Favicon quality matrix: main

- Run date: 2026-11-05
- Source commit: 3a86c10
- Environment: linux 6.17.0-1020-oracle arm64; Chromium 156.0.8078.4; Firefox unavailable
- Matrix sites: 68; display size: 72px; DPR: 1
- External access is best-effort and time-sensitive; this report is not a CI gate. Browser image load and unauthenticated HTTP header probes are recorded separately.

## Summary

| Platform | Hit rate | Clear rate |
|---|---:|---:|
| chromium-extension | 51/68 (75%) | 2/68 (3%) |
| web | 52/68 (76%) | 2/68 (3%) |
| firefox-build | 0/0 (0%) | 0/0 (0%) |

## Per-site final result

| Platform | ID | Category | Found | Source type | Source URL | Natural size | Clarity | Failure |
|---|---|---|---:|---|---|---:|---|---|
| chromium-extension | starter-youtube | video | yes | favicon.ico | https://www.youtube.com/favicon.ico | 16×16 | blurry | — |
| chromium-extension | starter-gmail | mail | no | text-fallback | — | 0×0 | not-found | default-globe-placeholder |
| chromium-extension | starter-maps | maps | yes | favicon.ico | https://maps.google.com/favicon.ico | 32×32 | blurry | — |
| chromium-extension | starter-wikipedia | encyclopedia | yes | favicon.ico | https://www.wikipedia.org/favicon.ico | 48×48 | blurry | — |
| chromium-extension | starter-reddit | social | yes | favicon.ico | https://www.reddit.com/favicon.ico | 32×32 | blurry | — |
| chromium-extension | starter-amazon | ecommerce | yes | favicon.ico | https://www.amazon.com/favicon.ico | 48×48 | blurry | — |
| chromium-extension | starter-chatgpt | ai | no | text-fallback | — | 0×0 | not-found | default-globe-placeholder |
| chromium-extension | starter-outlook | mail | no | text-fallback | — | 0×0 | not-found | default-globe-placeholder |
| chromium-extension | claude-new | ai | no | text-fallback | — | 0×0 | not-found | default-globe-placeholder |
| chromium-extension | search-google | search | yes | favicon.ico | https://www.google.com/favicon.ico | 32×32 | blurry | — |
| chromium-extension | search-bing | search | yes | favicon.ico | https://www.bing.com/favicon.ico | 32×32 | blurry | — |
| chromium-extension | search-duckduckgo | search | yes | favicon.ico | https://duckduckgo.com/favicon.ico | 32×32 | blurry | — |
| chromium-extension | search-baidu | search | yes | favicon.ico | https://www.baidu.com/favicon.ico | 64×64 | blurry | — |
| chromium-extension | mail-yahoo | mail | yes | favicon.ico | https://mail.yahoo.com/favicon.ico | 48×48 | blurry | — |
| chromium-extension | mail-proton | mail | yes | favicon.ico | https://proton.me/favicon.ico | 48×48 | blurry | — |
| chromium-extension | mail-icloud | mail | yes | favicon.ico | https://www.icloud.com/favicon.ico | 48×48 | blurry | — |
| chromium-extension | maps-apple | maps | yes | favicon.ico | https://maps.apple.com/favicon.ico | 64×64 | blurry | — |
| chromium-extension | maps-openstreetmap | maps | no | text-fallback | — | 0×0 | not-found | default-globe-placeholder |
| chromium-extension | social-x | social | yes | favicon.ico | https://x.com/favicon.ico | 32×32 | blurry | — |
| chromium-extension | social-facebook | social | yes | favicon.ico | https://www.facebook.com/favicon.ico | 60×60 | blurry | — |
| chromium-extension | social-instagram | social | no | text-fallback | — | 0×0 | not-found | default-globe-placeholder |
| chromium-extension | social-linkedin | social | yes | favicon.ico | https://www.linkedin.com/favicon.ico | 64×64 | blurry | — |
| chromium-extension | social-weibo | social | yes | favicon.ico | https://weibo.com/favicon.ico | 32×32 | blurry | — |
| chromium-extension | video-bilibili | video | yes | favicon.ico | https://www.bilibili.com/favicon.ico | 32×32 | blurry | — |
| chromium-extension | video-netflix | video | yes | favicon.ico | https://www.netflix.com/favicon.ico | 64×64 | blurry | — |
| chromium-extension | video-twitch | video | no | text-fallback | — | 0×0 | not-found | default-globe-placeholder |
| chromium-extension | ecommerce-ebay | ecommerce | yes | favicon.ico | https://www.ebay.com/favicon.ico | 16×16 | blurry | — |
| chromium-extension | ecommerce-taobao | ecommerce | yes | favicon.ico | https://www.taobao.com/favicon.ico | 64×64 | blurry | — |
| chromium-extension | ecommerce-jd | ecommerce | yes | favicon.ico | https://www.jd.com/favicon.ico | 48×48 | blurry | — |
| chromium-extension | ai-gemini | ai | no | text-fallback | — | 0×0 | not-found | default-globe-placeholder |
| chromium-extension | ai-perplexity | ai | yes | favicon.ico | https://www.perplexity.ai/favicon.ico | 48×48 | blurry | — |
| chromium-extension | ai-copilot | ai | yes | favicon.ico | https://copilot.microsoft.com/favicon.ico | 48×48 | blurry | — |
| chromium-extension | ai-deepseek | ai | yes | favicon.ico | https://www.deepseek.com/favicon.ico | 225×225 | clear | — |
| chromium-extension | ai-kimi | ai | yes | favicon.ico | https://www.kimi.com/favicon.ico | 48×48 | blurry | — |
| chromium-extension | dev-github | developer-tools | yes | favicon.ico | https://github.com/favicon.ico | 32×32 | blurry | — |
| chromium-extension | dev-gitlab | developer-tools | yes | favicon.ico | https://gitlab.com/favicon.ico | 32×32 | blurry | — |
| chromium-extension | dev-stackoverflow | developer-tools | yes | favicon.ico | https://stackoverflow.com/favicon.ico | 48×48 | blurry | — |
| chromium-extension | dev-mdn | developer-tools | yes | favicon.ico | https://developer.mozilla.org/favicon.ico | 48×48 | blurry | — |
| chromium-extension | dev-npm | developer-tools | no | text-fallback | — | 0×0 | not-found | default-globe-placeholder |
| chromium-extension | dev-vercel | developer-tools | yes | favicon.ico | https://vercel.com/favicon.ico | 48×48 | blurry | — |
| chromium-extension | news-nytimes | news | yes | favicon.ico | https://www.nytimes.com/favicon.ico | 48×48 | blurry | — |
| chromium-extension | news-bbc | news | yes | favicon.ico | https://www.bbc.com/favicon.ico | 48×48 | blurry | — |
| chromium-extension | news-cnn | news | no | text-fallback | — | 0×0 | not-found | default-globe-placeholder |
| chromium-extension | news-guardian | news | yes | favicon.ico | https://www.theguardian.com/favicon.ico | 32×32 | blurry | — |
| chromium-extension | office-notion | office | no | text-fallback | — | 0×0 | not-found | default-globe-placeholder |
| chromium-extension | office-google-docs | office | yes | favicon.ico | https://docs.google.com/favicon.ico | 32×32 | blurry | — |
| chromium-extension | office-microsoft | office | no | text-fallback | — | 0×0 | not-found | default-globe-placeholder |
| chromium-extension | cloud-google-drive | cloud-storage | yes | favicon.ico | https://drive.google.com/favicon.ico | 32×32 | blurry | — |
| chromium-extension | cloud-dropbox | cloud-storage | no | text-fallback | — | 0×0 | not-found | default-globe-placeholder |
| chromium-extension | cloud-onedrive | cloud-storage | yes | favicon.ico | https://onedrive.live.com/favicon.ico | 32×32 | blurry | — |
| chromium-extension | music-spotify | music | yes | favicon.ico | https://open.spotify.com/favicon.ico | 48×48 | blurry | — |
| chromium-extension | music-soundcloud | music | yes | favicon.ico | https://soundcloud.com/favicon.ico | 32×32 | blurry | — |
| chromium-extension | music-bandcamp | music | no | text-fallback | — | 0×0 | not-found | default-globe-placeholder |
| chromium-extension | education-coursera | education | yes | favicon.ico | https://www.coursera.org/favicon.ico | 48×48 | blurry | — |
| chromium-extension | education-khan | education | yes | favicon.ico | https://www.khanacademy.org/favicon.ico | 32×32 | blurry | — |
| chromium-extension | education-arxiv | education | yes | favicon.ico | https://arxiv.org/favicon.ico | 32×32 | blurry | — |
| chromium-extension | travel-airbnb | travel | yes | favicon.ico | https://www.airbnb.com/favicon.ico | 32×32 | blurry | — |
| chromium-extension | travel-booking | travel | no | text-fallback | — | 0×0 | not-found | default-globe-placeholder |
| chromium-extension | travel-tripadvisor | travel | yes | favicon.ico | https://www.tripadvisor.com/favicon.ico | 48×48 | blurry | — |
| chromium-extension | finance-paypal | finance | yes | favicon.ico | https://www.paypal.com/favicon.ico | 32×32 | blurry | — |
| chromium-extension | finance-stripe | finance | yes | favicon.ico | https://stripe.com/favicon.ico | 48×48 | blurry | — |
| chromium-extension | finance-coinbase | finance | yes | favicon.ico | https://www.coinbase.com/favicon.ico | 32×32 | blurry | — |
| chromium-extension | messaging-whatsapp | messaging | no | text-fallback | — | 0×0 | not-found | default-globe-placeholder |
| chromium-extension | messaging-telegram | messaging | yes | favicon.ico | https://telegram.org/favicon.ico | 32×32 | blurry | — |
| chromium-extension | messaging-discord | messaging | no | text-fallback | — | 0×0 | not-found | default-globe-placeholder |
| chromium-extension | productivity-trello | productivity | yes | favicon.ico | https://trello.com/favicon.ico | 256×256 | clear | — |
| chromium-extension | productivity-asana | productivity | yes | favicon.ico | https://asana.com/favicon.ico | 48×48 | blurry | — |
| chromium-extension | productivity-linear | productivity | yes | favicon.ico | https://linear.app/favicon.ico | 48×48 | blurry | — |
| web | starter-youtube | video | yes | favicon.ico | https://www.youtube.com/favicon.ico | 16×16 | blurry | — |
| web | starter-gmail | mail | no | text-fallback | — | 0×0 | not-found | image-decode-or-policy-error-http-200 |
| web | starter-maps | maps | yes | favicon.ico | https://maps.google.com/favicon.ico | 32×32 | blurry | — |
| web | starter-wikipedia | encyclopedia | yes | favicon.ico | https://www.wikipedia.org/favicon.ico | 48×48 | blurry | — |
| web | starter-reddit | social | yes | favicon.ico | https://www.reddit.com/favicon.ico | 32×32 | blurry | — |
| web | starter-amazon | ecommerce | yes | favicon.ico | https://www.amazon.com/favicon.ico | 48×48 | blurry | — |
| web | starter-chatgpt | ai | no | text-fallback | — | 0×0 | not-found | image-decode-or-policy-error-http-404 |
| web | starter-outlook | mail | no | text-fallback | — | 0×0 | not-found | image-decode-or-policy-error-http-200 |
| web | claude-new | ai | no | text-fallback | — | 0×0 | not-found | blocked-by-corp-same-origin |
| web | search-google | search | yes | favicon.ico | https://www.google.com/favicon.ico | 32×32 | blurry | — |
| web | search-bing | search | yes | favicon.ico | https://www.bing.com/favicon.ico | 32×32 | blurry | — |
| web | search-duckduckgo | search | yes | favicon.ico | https://duckduckgo.com/favicon.ico | 32×32 | blurry | — |
| web | search-baidu | search | yes | favicon.ico | https://www.baidu.com/favicon.ico | 64×64 | blurry | — |
| web | mail-yahoo | mail | yes | favicon.ico | https://mail.yahoo.com/favicon.ico | 48×48 | blurry | — |
| web | mail-proton | mail | yes | favicon.ico | https://proton.me/favicon.ico | 48×48 | blurry | — |
| web | mail-icloud | mail | yes | favicon.ico | https://www.icloud.com/favicon.ico | 48×48 | blurry | — |
| web | maps-apple | maps | yes | favicon.ico | https://maps.apple.com/favicon.ico | 64×64 | blurry | — |
| web | maps-openstreetmap | maps | yes | favicon.ico | https://www.openstreetmap.org/favicon.ico | 48×48 | blurry | — |
| web | social-x | social | yes | favicon.ico | https://x.com/favicon.ico | 32×32 | blurry | — |
| web | social-facebook | social | yes | favicon.ico | https://www.facebook.com/favicon.ico | 60×60 | blurry | — |
| web | social-instagram | social | no | text-fallback | — | 0×0 | not-found | blocked-by-corp-same-origin |
| web | social-linkedin | social | yes | favicon.ico | https://www.linkedin.com/favicon.ico | 64×64 | blurry | — |
| web | social-weibo | social | yes | favicon.ico | https://weibo.com/favicon.ico | 32×32 | blurry | — |
| web | video-bilibili | video | yes | favicon.ico | https://www.bilibili.com/favicon.ico | 32×32 | blurry | — |
| web | video-netflix | video | yes | favicon.ico | https://www.netflix.com/favicon.ico | 64×64 | blurry | — |
| web | video-twitch | video | no | text-fallback | — | 0×0 | not-found | content-type-application/octet-stream |
| web | ecommerce-ebay | ecommerce | yes | favicon.ico | https://www.ebay.com/favicon.ico | 16×16 | blurry | — |
| web | ecommerce-taobao | ecommerce | yes | favicon.ico | https://www.taobao.com/favicon.ico | 64×64 | blurry | — |
| web | ecommerce-jd | ecommerce | yes | favicon.ico | https://www.jd.com/favicon.ico | 48×48 | blurry | — |
| web | ai-gemini | ai | no | text-fallback | — | 0×0 | not-found | image-decode-or-policy-error-http-404 |
| web | ai-perplexity | ai | yes | favicon.ico | https://www.perplexity.ai/favicon.ico | 48×48 | blurry | — |
| web | ai-copilot | ai | yes | favicon.ico | https://copilot.microsoft.com/favicon.ico | 48×48 | blurry | — |
| web | ai-deepseek | ai | yes | favicon.ico | https://www.deepseek.com/favicon.ico | 225×225 | clear | — |
| web | ai-kimi | ai | yes | favicon.ico | https://www.kimi.com/favicon.ico | 48×48 | blurry | — |
| web | dev-github | developer-tools | yes | favicon.ico | https://github.com/favicon.ico | 32×32 | blurry | — |
| web | dev-gitlab | developer-tools | yes | favicon.ico | https://gitlab.com/favicon.ico | 32×32 | blurry | — |
| web | dev-stackoverflow | developer-tools | yes | favicon.ico | https://stackoverflow.com/favicon.ico | 48×48 | blurry | — |
| web | dev-mdn | developer-tools | yes | favicon.ico | https://developer.mozilla.org/favicon.ico | 48×48 | blurry | — |
| web | dev-npm | developer-tools | no | text-fallback | — | 0×0 | not-found | bot-challenge |
| web | dev-vercel | developer-tools | yes | favicon.ico | https://vercel.com/favicon.ico | 48×48 | blurry | — |
| web | news-nytimes | news | yes | favicon.ico | https://www.nytimes.com/favicon.ico | 48×48 | blurry | — |
| web | news-bbc | news | yes | favicon.ico | https://www.bbc.com/favicon.ico | 48×48 | blurry | — |
| web | news-cnn | news | no | text-fallback | — | 0×0 | not-found | image-decode-or-policy-error-http-200 |
| web | news-guardian | news | yes | favicon.ico | https://www.theguardian.com/favicon.ico | 32×32 | blurry | — |
| web | office-notion | office | no | text-fallback | — | 0×0 | not-found | image-decode-or-policy-error-http-403 |
| web | office-google-docs | office | yes | favicon.ico | https://docs.google.com/favicon.ico | 32×32 | blurry | — |
| web | office-microsoft | office | no | text-fallback | — | 0×0 | not-found | image-decode-or-policy-error-http-200 |
| web | cloud-google-drive | cloud-storage | yes | favicon.ico | https://drive.google.com/favicon.ico | 32×32 | blurry | — |
| web | cloud-dropbox | cloud-storage | no | text-fallback | — | 0×0 | not-found | image-decode-or-policy-error-http-404 |
| web | cloud-onedrive | cloud-storage | yes | favicon.ico | https://onedrive.live.com/favicon.ico | 32×32 | blurry | — |
| web | music-spotify | music | yes | favicon.ico | https://open.spotify.com/favicon.ico | 48×48 | blurry | — |
| web | music-soundcloud | music | yes | favicon.ico | https://soundcloud.com/favicon.ico | 32×32 | blurry | — |
| web | music-bandcamp | music | no | text-fallback | — | 0×0 | not-found | image-decode-or-policy-error-http-404 |
| web | education-coursera | education | yes | favicon.ico | https://www.coursera.org/favicon.ico | 48×48 | blurry | — |
| web | education-khan | education | yes | favicon.ico | https://www.khanacademy.org/favicon.ico | 32×32 | blurry | — |
| web | education-arxiv | education | yes | favicon.ico | https://arxiv.org/favicon.ico | 32×32 | blurry | — |
| web | travel-airbnb | travel | yes | favicon.ico | https://www.airbnb.com/favicon.ico | 32×32 | blurry | — |
| web | travel-booking | travel | no | text-fallback | — | 0×0 | not-found | image-decode-or-policy-error-http-404 |
| web | travel-tripadvisor | travel | yes | favicon.ico | https://www.tripadvisor.com/favicon.ico | 48×48 | blurry | — |
| web | finance-paypal | finance | yes | favicon.ico | https://www.paypal.com/favicon.ico | 32×32 | blurry | — |
| web | finance-stripe | finance | yes | favicon.ico | https://stripe.com/favicon.ico | 48×48 | blurry | — |
| web | finance-coinbase | finance | yes | favicon.ico | https://www.coinbase.com/favicon.ico | 32×32 | blurry | — |
| web | messaging-whatsapp | messaging | no | text-fallback | — | 0×0 | not-found | blocked-by-corp-same-origin |
| web | messaging-telegram | messaging | yes | favicon.ico | https://telegram.org/favicon.ico | 32×32 | blurry | — |
| web | messaging-discord | messaging | no | text-fallback | — | 0×0 | not-found | image-decode-or-policy-error-http-404 |
| web | productivity-trello | productivity | yes | favicon.ico | https://trello.com/favicon.ico | 256×256 | clear | — |
| web | productivity-asana | productivity | yes | favicon.ico | https://asana.com/favicon.ico | 48×48 | blurry | — |
| web | productivity-linear | productivity | yes | favicon.ico | https://linear.app/favicon.ico | 48×48 | blurry | — |

## Candidate diagnostics

| Platform | ID | Candidate | URL | HTTP | Content type | Natural size | Browser image | Time ms | CORP | Metadata source | Failure |
|---|---|---|---|---:|---|---:|---|---:|---|---|---|
| chromium-extension | starter-youtube | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fwww.youtube.com%2F&size=64 | 200 | — | 64×64 | loaded | 18 | — | browser | default-globe-placeholder |
| chromium-extension | starter-youtube | favicon.ico | https://www.youtube.com/favicon.ico | 200 | image/x-icon | 16×16 | loaded | 84 | cross-origin | unauthenticated-http-probe | — |
| chromium-extension | starter-gmail | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fmail.google.com%2F&size=64 | 200 | — | 64×64 | loaded | 19 | — | browser | default-globe-placeholder |
| chromium-extension | starter-gmail | favicon.ico | https://mail.google.com/favicon.ico | 200 | image/x-icon | 0×0 | failed | 184 | cross-origin | unauthenticated-http-probe | image-decode-or-policy-error-http-200 |
| chromium-extension | starter-maps | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fmaps.google.com%2F&size=64 | 200 | — | 64×64 | loaded | 26 | — | browser | default-globe-placeholder |
| chromium-extension | starter-maps | favicon.ico | https://maps.google.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 187 | cross-origin | unauthenticated-http-probe | — |
| chromium-extension | starter-wikipedia | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fwww.wikipedia.org%2F&size=64 | 200 | — | 64×64 | loaded | 7 | — | browser | default-globe-placeholder |
| chromium-extension | starter-wikipedia | favicon.ico | https://www.wikipedia.org/favicon.ico | 200 | image/vnd.microsoft.icon | 48×48 | loaded | 110 | — | unauthenticated-http-probe | — |
| chromium-extension | starter-reddit | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fwww.reddit.com%2F&size=64 | 200 | — | 64×64 | loaded | 5 | — | browser | default-globe-placeholder |
| chromium-extension | starter-reddit | favicon.ico | https://www.reddit.com/favicon.ico | 200 | image/vnd.microsoft.icon | 32×32 | loaded | 35 | — | unauthenticated-http-probe | — |
| chromium-extension | starter-amazon | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fwww.amazon.com%2F&size=64 | 200 | — | 64×64 | loaded | 7 | — | browser | default-globe-placeholder |
| chromium-extension | starter-amazon | favicon.ico | https://www.amazon.com/favicon.ico | 200 | image/x-icon | 48×48 | loaded | 67 | — | unauthenticated-http-probe | — |
| chromium-extension | starter-chatgpt | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fchatgpt.com%2F&size=64 | 200 | — | 64×64 | loaded | 7 | — | browser | default-globe-placeholder |
| chromium-extension | starter-chatgpt | favicon.ico | https://chatgpt.com/favicon.ico | 404 | — | 0×0 | failed | 48 | — | unauthenticated-http-probe | image-decode-or-policy-error-http-404 |
| chromium-extension | starter-outlook | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Foutlook.live.com%2F&size=64 | 200 | — | 64×64 | loaded | 7 | — | browser | default-globe-placeholder |
| chromium-extension | starter-outlook | favicon.ico | https://outlook.live.com/favicon.ico | 200 | text/html | 0×0 | failed | 48 | — | unauthenticated-http-probe | image-decode-or-policy-error-http-200 |
| chromium-extension | claude-new | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fclaude.ai%2Fnew&size=64 | 200 | — | 64×64 | loaded | 6 | — | browser | default-globe-placeholder |
| chromium-extension | claude-new | favicon.ico | https://claude.ai/favicon.ico | 200 | image/vnd.microsoft.icon | 0×0 | failed | 48 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| chromium-extension | search-google | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fwww.google.com%2F&size=64 | 200 | — | 64×64 | loaded | 12 | — | browser | default-globe-placeholder |
| chromium-extension | search-google | favicon.ico | https://www.google.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 43 | cross-origin | unauthenticated-http-probe | — |
| chromium-extension | search-bing | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fwww.bing.com%2F&size=64 | 200 | — | 64×64 | loaded | 8 | — | browser | default-globe-placeholder |
| chromium-extension | search-bing | favicon.ico | https://www.bing.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 37 | — | unauthenticated-http-probe | — |
| chromium-extension | search-duckduckgo | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fduckduckgo.com%2F&size=64 | 200 | — | 64×64 | loaded | 4 | — | browser | default-globe-placeholder |
| chromium-extension | search-duckduckgo | favicon.ico | https://duckduckgo.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 88 | — | unauthenticated-http-probe | — |
| chromium-extension | search-baidu | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fwww.baidu.com%2F&size=64 | 200 | — | 64×64 | loaded | 6 | — | browser | default-globe-placeholder |
| chromium-extension | search-baidu | favicon.ico | https://www.baidu.com/favicon.ico | 200 | image/x-icon | 64×64 | loaded | 830 | — | unauthenticated-http-probe | — |
| chromium-extension | mail-yahoo | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fmail.yahoo.com%2F&size=64 | 200 | — | 64×64 | loaded | 3 | — | browser | default-globe-placeholder |
| chromium-extension | mail-yahoo | favicon.ico | https://mail.yahoo.com/favicon.ico | 200 | image/vnd.microsoft.icon | 48×48 | loaded | 30 | — | unauthenticated-http-probe | — |
| chromium-extension | mail-proton | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fproton.me%2F&size=64 | 200 | — | 64×64 | loaded | 6 | — | browser | default-globe-placeholder |
| chromium-extension | mail-proton | favicon.ico | https://proton.me/favicon.ico | 200 | image/vnd.microsoft.icon | 48×48 | loaded | 358 | — | unauthenticated-http-probe | — |
| chromium-extension | mail-icloud | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fwww.icloud.com%2Fmail&size=64 | 200 | — | 64×64 | loaded | 3 | — | browser | default-globe-placeholder |
| chromium-extension | mail-icloud | favicon.ico | https://www.icloud.com/favicon.ico | 200 | image/x-icon | 48×48 | loaded | 74 | — | unauthenticated-http-probe | — |
| chromium-extension | maps-apple | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fmaps.apple.com%2F&size=64 | 200 | — | 64×64 | loaded | 6 | — | browser | default-globe-placeholder |
| chromium-extension | maps-apple | favicon.ico | https://maps.apple.com/favicon.ico | 200 | image/x-icon | 64×64 | loaded | 106 | — | unauthenticated-http-probe | — |
| chromium-extension | maps-openstreetmap | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fwww.openstreetmap.org%2F&size=64 | 200 | — | 64×64 | loaded | 5 | — | browser | default-globe-placeholder |
| chromium-extension | maps-openstreetmap | favicon.ico | https://www.openstreetmap.org/favicon.ico | 429 | text/html; charset=utf-8 | 48×48 | loaded | 322 | — | unauthenticated-http-probe | content-type-text/html; charset=utf-8 |
| chromium-extension | social-x | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fx.com%2F&size=64 | 200 | — | 64×64 | loaded | 4 | — | browser | default-globe-placeholder |
| chromium-extension | social-x | favicon.ico | https://x.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 162 | — | unauthenticated-http-probe | — |
| chromium-extension | social-facebook | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fwww.facebook.com%2F&size=64 | 200 | — | 64×64 | loaded | 4 | — | browser | default-globe-placeholder |
| chromium-extension | social-facebook | favicon.ico | https://www.facebook.com/favicon.ico | 200 | image/png | 60×60 | loaded | 64 | cross-origin | unauthenticated-http-probe | — |
| chromium-extension | social-instagram | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fwww.instagram.com%2F&size=64 | 200 | — | 64×64 | loaded | 4 | — | browser | default-globe-placeholder |
| chromium-extension | social-instagram | favicon.ico | https://www.instagram.com/favicon.ico | 200 | image/png | 0×0 | failed | 148 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| chromium-extension | social-linkedin | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fwww.linkedin.com%2F&size=64 | 200 | — | 64×64 | loaded | 6 | — | browser | default-globe-placeholder |
| chromium-extension | social-linkedin | favicon.ico | https://www.linkedin.com/favicon.ico | 200 | image/x-icon | 64×64 | loaded | 183 | — | unauthenticated-http-probe | — |
| chromium-extension | social-weibo | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fweibo.com%2F&size=64 | 200 | — | 64×64 | loaded | 3 | — | browser | default-globe-placeholder |
| chromium-extension | social-weibo | favicon.ico | https://weibo.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 988 | — | unauthenticated-http-probe | — |
| chromium-extension | video-bilibili | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fwww.bilibili.com%2F&size=64 | 200 | — | 64×64 | loaded | 3 | — | browser | default-globe-placeholder |
| chromium-extension | video-bilibili | favicon.ico | https://www.bilibili.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 372 | — | unauthenticated-http-probe | — |
| chromium-extension | video-netflix | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fwww.netflix.com%2F&size=64 | 200 | — | 64×64 | loaded | 3 | — | browser | default-globe-placeholder |
| chromium-extension | video-netflix | favicon.ico | https://www.netflix.com/favicon.ico | 200 | image/x-icon | 64×64 | loaded | 123 | — | unauthenticated-http-probe | — |
| chromium-extension | video-twitch | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fwww.twitch.tv%2F&size=64 | 200 | — | 64×64 | loaded | 6 | — | browser | default-globe-placeholder |
| chromium-extension | video-twitch | favicon.ico | https://www.twitch.tv/favicon.ico | 200 | application/octet-stream | 32×32 | loaded | 28 | — | unauthenticated-http-probe | content-type-application/octet-stream |
| chromium-extension | ecommerce-ebay | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fwww.ebay.com%2F&size=64 | 200 | — | 64×64 | loaded | 4 | — | browser | default-globe-placeholder |
| chromium-extension | ecommerce-ebay | favicon.ico | https://www.ebay.com/favicon.ico | 200 | image/x-icon | 16×16 | loaded | 144 | — | unauthenticated-http-probe | — |
| chromium-extension | ecommerce-taobao | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fwww.taobao.com%2F&size=64 | 200 | — | 64×64 | loaded | 3 | — | browser | default-globe-placeholder |
| chromium-extension | ecommerce-taobao | favicon.ico | https://www.taobao.com/favicon.ico | 200 | image/x-icon | 64×64 | loaded | 1761 | — | unauthenticated-http-probe | — |
| chromium-extension | ecommerce-jd | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fwww.jd.com%2F&size=64 | 200 | — | 64×64 | loaded | 2 | — | browser | default-globe-placeholder |
| chromium-extension | ecommerce-jd | favicon.ico | https://www.jd.com/favicon.ico | 200 | image/x-icon | 48×48 | loaded | 1228 | — | unauthenticated-http-probe | — |
| chromium-extension | ai-gemini | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fgemini.google.com%2F&size=64 | 200 | — | 64×64 | loaded | 3 | — | browser | default-globe-placeholder |
| chromium-extension | ai-gemini | favicon.ico | https://gemini.google.com/favicon.ico | 404 | text/html; charset=utf-8 | 0×0 | failed | 119 | — | unauthenticated-http-probe | image-decode-or-policy-error-http-404 |
| chromium-extension | ai-perplexity | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fwww.perplexity.ai%2F&size=64 | 200 | — | 64×64 | loaded | 3 | — | browser | default-globe-placeholder |
| chromium-extension | ai-perplexity | favicon.ico | https://www.perplexity.ai/favicon.ico | 200 | image/x-icon | 48×48 | loaded | 32 | cross-origin | unauthenticated-http-probe | — |
| chromium-extension | ai-copilot | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fcopilot.microsoft.com%2F&size=64 | 200 | — | 64×64 | loaded | 8 | — | browser | default-globe-placeholder |
| chromium-extension | ai-copilot | favicon.ico | https://copilot.microsoft.com/favicon.ico | 200 | image/vnd.microsoft.icon | 48×48 | loaded | 32 | — | unauthenticated-http-probe | — |
| chromium-extension | ai-deepseek | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fwww.deepseek.com%2F&size=64 | 200 | — | 64×64 | loaded | 3 | — | browser | default-globe-placeholder |
| chromium-extension | ai-deepseek | favicon.ico | https://www.deepseek.com/favicon.ico | 200 | image/vnd.microsoft.icon | 225×225 | loaded | 309 | — | unauthenticated-http-probe | — |
| chromium-extension | ai-kimi | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fwww.kimi.com%2F&size=64 | 200 | — | 64×64 | loaded | 3 | — | browser | default-globe-placeholder |
| chromium-extension | ai-kimi | favicon.ico | https://www.kimi.com/favicon.ico | 200 | — | 48×48 | loaded | 206 | — | unauthenticated-http-probe | — |
| chromium-extension | dev-github | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fgithub.com%2F&size=64 | 200 | — | 64×64 | loaded | 3 | — | browser | default-globe-placeholder |
| chromium-extension | dev-github | favicon.ico | https://github.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 69 | — | unauthenticated-http-probe | — |
| chromium-extension | dev-gitlab | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fgitlab.com%2F&size=64 | 200 | — | 64×64 | loaded | 4 | — | browser | default-globe-placeholder |
| chromium-extension | dev-gitlab | favicon.ico | https://gitlab.com/favicon.ico | 200 | image/png | 32×32 | loaded | 165 | — | unauthenticated-http-probe | — |
| chromium-extension | dev-stackoverflow | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fstackoverflow.com%2F&size=64 | 200 | — | 64×64 | loaded | 4 | — | browser | default-globe-placeholder |
| chromium-extension | dev-stackoverflow | favicon.ico | https://stackoverflow.com/favicon.ico | 200 | image/x-icon | 48×48 | loaded | 120 | — | unauthenticated-http-probe | — |
| chromium-extension | dev-mdn | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fdeveloper.mozilla.org%2F&size=64 | 200 | — | 64×64 | loaded | 3 | — | browser | default-globe-placeholder |
| chromium-extension | dev-mdn | favicon.ico | https://developer.mozilla.org/favicon.ico | 200 | image/x-icon | 48×48 | loaded | 94 | — | unauthenticated-http-probe | — |
| chromium-extension | dev-npm | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fwww.npmjs.com%2F&size=64 | 200 | — | 64×64 | loaded | 3 | — | browser | default-globe-placeholder |
| chromium-extension | dev-npm | favicon.ico | https://www.npmjs.com/favicon.ico | 403 | text/html; charset=UTF-8 | 0×0 | failed | 46 | same-origin | unauthenticated-http-probe | bot-challenge |
| chromium-extension | dev-vercel | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fvercel.com%2F&size=64 | 200 | — | 64×64 | loaded | 2 | — | browser | default-globe-placeholder |
| chromium-extension | dev-vercel | favicon.ico | https://vercel.com/favicon.ico | 200 | image/vnd.microsoft.icon | 48×48 | loaded | 58 | — | unauthenticated-http-probe | — |
| chromium-extension | news-nytimes | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fwww.nytimes.com%2F&size=64 | 200 | — | 64×64 | loaded | 4 | — | browser | default-globe-placeholder |
| chromium-extension | news-nytimes | favicon.ico | https://www.nytimes.com/favicon.ico | 200 | image/x-icon | 48×48 | loaded | 25 | — | unauthenticated-http-probe | — |
| chromium-extension | news-bbc | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fwww.bbc.com%2F&size=64 | 200 | — | 64×64 | loaded | 3 | — | browser | default-globe-placeholder |
| chromium-extension | news-bbc | favicon.ico | https://www.bbc.com/favicon.ico | 200 | image/vnd.microsoft.icon | 48×48 | loaded | 217 | — | unauthenticated-http-probe | — |
| chromium-extension | news-cnn | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fwww.cnn.com%2F&size=64 | 200 | — | 64×64 | loaded | 3 | — | browser | default-globe-placeholder |
| chromium-extension | news-cnn | favicon.ico | https://www.cnn.com/favicon.ico | 200 | image/x-icon | 0×0 | failed | 27 | — | unauthenticated-http-probe | image-decode-or-policy-error-http-200 |
| chromium-extension | news-guardian | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fwww.theguardian.com%2F&size=64 | 200 | — | 64×64 | loaded | 2 | — | browser | default-globe-placeholder |
| chromium-extension | news-guardian | favicon.ico | https://www.theguardian.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 24 | — | unauthenticated-http-probe | — |
| chromium-extension | office-notion | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fwww.notion.so%2F&size=64 | 200 | — | 64×64 | loaded | 3 | — | browser | default-globe-placeholder |
| chromium-extension | office-notion | favicon.ico | https://www.notion.so/favicon.ico | 403 | text/html; charset=UTF-8 | 0×0 | failed | 46 | — | unauthenticated-http-probe | image-decode-or-policy-error-http-403 |
| chromium-extension | office-google-docs | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fdocs.google.com%2F&size=64 | 200 | — | 64×64 | loaded | 5 | — | browser | default-globe-placeholder |
| chromium-extension | office-google-docs | favicon.ico | https://docs.google.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 183 | cross-origin | unauthenticated-http-probe | — |
| chromium-extension | office-microsoft | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fwww.office.com%2F&size=64 | 200 | — | 64×64 | loaded | 3 | — | browser | default-globe-placeholder |
| chromium-extension | office-microsoft | favicon.ico | https://www.office.com/favicon.ico | 200 | text/html; charset=utf-8 | 0×0 | failed | 357 | — | unauthenticated-http-probe | image-decode-or-policy-error-http-200 |
| chromium-extension | cloud-google-drive | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fdrive.google.com%2F&size=64 | 200 | — | 64×64 | loaded | 3 | — | browser | default-globe-placeholder |
| chromium-extension | cloud-google-drive | favicon.ico | https://drive.google.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 83 | cross-origin | unauthenticated-http-probe | — |
| chromium-extension | cloud-dropbox | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fwww.dropbox.com%2F&size=64 | 200 | — | 64×64 | loaded | 3 | — | browser | default-globe-placeholder |
| chromium-extension | cloud-dropbox | favicon.ico | https://www.dropbox.com/favicon.ico | 404 | text/html | 0×0 | failed | 46 | — | unauthenticated-http-probe | image-decode-or-policy-error-http-404 |
| chromium-extension | cloud-onedrive | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fonedrive.live.com%2F&size=64 | 200 | — | 64×64 | loaded | 3 | — | browser | default-globe-placeholder |
| chromium-extension | cloud-onedrive | favicon.ico | https://onedrive.live.com/favicon.ico | 403 | — | 32×32 | loaded | 180 | — | unauthenticated-http-probe | — |
| chromium-extension | music-spotify | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fopen.spotify.com%2F&size=64 | 200 | — | 64×64 | loaded | 4 | — | browser | default-globe-placeholder |
| chromium-extension | music-spotify | favicon.ico | https://open.spotify.com/favicon.ico | 200 | image/vnd.microsoft.icon | 48×48 | loaded | 104 | — | unauthenticated-http-probe | — |
| chromium-extension | music-soundcloud | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fsoundcloud.com%2F&size=64 | 200 | — | 64×64 | loaded | 3 | — | browser | default-globe-placeholder |
| chromium-extension | music-soundcloud | favicon.ico | https://soundcloud.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 260 | — | unauthenticated-http-probe | — |
| chromium-extension | music-bandcamp | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fbandcamp.com%2F&size=64 | 200 | — | 64×64 | loaded | 4 | — | browser | default-globe-placeholder |
| chromium-extension | music-bandcamp | favicon.ico | https://bandcamp.com/favicon.ico | 404 | — | 0×0 | failed | 76 | — | unauthenticated-http-probe | image-decode-or-policy-error-http-404 |
| chromium-extension | education-coursera | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fwww.coursera.org%2F&size=64 | 200 | — | 64×64 | loaded | 3 | — | browser | default-globe-placeholder |
| chromium-extension | education-coursera | favicon.ico | https://www.coursera.org/favicon.ico | 200 | image/x-icon | 48×48 | loaded | 998 | — | unauthenticated-http-probe | — |
| chromium-extension | education-khan | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fwww.khanacademy.org%2F&size=64 | 200 | — | 64×64 | loaded | 4 | — | browser | default-globe-placeholder |
| chromium-extension | education-khan | favicon.ico | https://www.khanacademy.org/favicon.ico | 200 | image/vnd.microsoft.icon | 32×32 | loaded | 165 | — | unauthenticated-http-probe | — |
| chromium-extension | education-arxiv | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Farxiv.org%2F&size=64 | 200 | — | 64×64 | loaded | 3 | — | browser | default-globe-placeholder |
| chromium-extension | education-arxiv | favicon.ico | https://arxiv.org/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 52 | — | unauthenticated-http-probe | — |
| chromium-extension | travel-airbnb | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fwww.airbnb.com%2F&size=64 | 200 | — | 64×64 | loaded | 3 | — | browser | default-globe-placeholder |
| chromium-extension | travel-airbnb | favicon.ico | https://www.airbnb.com/favicon.ico | 200 | image/vnd.microsoft.icon | 32×32 | loaded | 407 | — | unauthenticated-http-probe | — |
| chromium-extension | travel-booking | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fwww.booking.com%2F&size=64 | 200 | — | 64×64 | loaded | 3 | — | browser | default-globe-placeholder |
| chromium-extension | travel-booking | favicon.ico | https://www.booking.com/favicon.ico | 404 | text/html | 0×0 | failed | 285 | — | unauthenticated-http-probe | image-decode-or-policy-error-http-404 |
| chromium-extension | travel-tripadvisor | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fwww.tripadvisor.com%2F&size=64 | 200 | — | 64×64 | loaded | 4 | — | browser | default-globe-placeholder |
| chromium-extension | travel-tripadvisor | favicon.ico | https://www.tripadvisor.com/favicon.ico | 200 | image/x-icon | 48×48 | loaded | 105 | — | unauthenticated-http-probe | — |
| chromium-extension | finance-paypal | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fwww.paypal.com%2F&size=64 | 200 | — | 64×64 | loaded | 4 | — | browser | default-globe-placeholder |
| chromium-extension | finance-paypal | favicon.ico | https://www.paypal.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 94 | — | unauthenticated-http-probe | — |
| chromium-extension | finance-stripe | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fstripe.com%2F&size=64 | 200 | — | 64×64 | loaded | 3 | — | browser | default-globe-placeholder |
| chromium-extension | finance-stripe | favicon.ico | https://stripe.com/favicon.ico | 200 | image/vnd.microsoft.icon; charset=utf-8 | 48×48 | loaded | 168 | — | unauthenticated-http-probe | — |
| chromium-extension | finance-coinbase | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fwww.coinbase.com%2F&size=64 | 200 | — | 64×64 | loaded | 3 | — | browser | default-globe-placeholder |
| chromium-extension | finance-coinbase | favicon.ico | https://www.coinbase.com/favicon.ico | 200 | image/vnd.microsoft.icon | 32×32 | loaded | 43 | — | unauthenticated-http-probe | — |
| chromium-extension | messaging-whatsapp | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fwww.whatsapp.com%2F&size=64 | 200 | — | 64×64 | loaded | 3 | — | browser | default-globe-placeholder |
| chromium-extension | messaging-whatsapp | favicon.ico | https://www.whatsapp.com/favicon.ico | 200 | image/png | 0×0 | failed | 41 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| chromium-extension | messaging-telegram | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Ftelegram.org%2F&size=64 | 200 | — | 64×64 | loaded | 2 | — | browser | default-globe-placeholder |
| chromium-extension | messaging-telegram | favicon.ico | https://telegram.org/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 307 | — | unauthenticated-http-probe | — |
| chromium-extension | messaging-discord | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fdiscord.com%2F&size=64 | 200 | — | 64×64 | loaded | 3 | — | browser | default-globe-placeholder |
| chromium-extension | messaging-discord | favicon.ico | https://discord.com/favicon.ico | 404 | text/html | 0×0 | failed | 99 | — | unauthenticated-http-probe | image-decode-or-policy-error-http-404 |
| chromium-extension | productivity-trello | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Ftrello.com%2F&size=64 | 200 | — | 64×64 | loaded | 3 | — | browser | default-globe-placeholder |
| chromium-extension | productivity-trello | favicon.ico | https://trello.com/favicon.ico | 200 | image/vnd.microsoft.icon | 256×256 | loaded | 161 | — | unauthenticated-http-probe | — |
| chromium-extension | productivity-asana | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Fasana.com%2F&size=64 | 200 | — | 64×64 | loaded | 3 | — | browser | default-globe-placeholder |
| chromium-extension | productivity-asana | favicon.ico | https://asana.com/favicon.ico | 200 | image/vnd.microsoft.icon | 48×48 | loaded | 130 | — | unauthenticated-http-probe | — |
| chromium-extension | productivity-linear | chrome-_favicon | chrome-extension://ipjigbbcpnknkabolhgjalpeghbgmknl/_favicon/?pageUrl=https%3A%2F%2Flinear.app%2F&size=64 | 200 | — | 64×64 | loaded | 7 | — | browser | default-globe-placeholder |
| chromium-extension | productivity-linear | favicon.ico | https://linear.app/favicon.ico | 200 | image/x-icon | 48×48 | loaded | 63 | — | unauthenticated-http-probe | — |
| web | starter-youtube | favicon.ico | https://www.youtube.com/favicon.ico | 200 | image/x-icon | 16×16 | loaded | 56 | cross-origin | unauthenticated-http-probe | — |
| web | starter-gmail | favicon.ico | https://mail.google.com/favicon.ico | 200 | image/x-icon | 0×0 | failed | 85 | cross-origin | unauthenticated-http-probe | image-decode-or-policy-error-http-200 |
| web | starter-maps | favicon.ico | https://maps.google.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 54 | cross-origin | unauthenticated-http-probe | — |
| web | starter-wikipedia | favicon.ico | https://www.wikipedia.org/favicon.ico | 200 | image/vnd.microsoft.icon | 48×48 | loaded | 80 | — | unauthenticated-http-probe | — |
| web | starter-reddit | favicon.ico | https://www.reddit.com/favicon.ico | 200 | image/vnd.microsoft.icon | 32×32 | loaded | 21 | — | unauthenticated-http-probe | — |
| web | starter-amazon | favicon.ico | https://www.amazon.com/favicon.ico | 200 | image/x-icon | 48×48 | loaded | 59 | — | unauthenticated-http-probe | — |
| web | starter-chatgpt | favicon.ico | https://chatgpt.com/favicon.ico | 404 | — | 0×0 | failed | 31 | — | unauthenticated-http-probe | image-decode-or-policy-error-http-404 |
| web | starter-outlook | favicon.ico | https://outlook.live.com/favicon.ico | 200 | text/html | 0×0 | failed | 34 | — | unauthenticated-http-probe | image-decode-or-policy-error-http-200 |
| web | claude-new | favicon.ico | https://claude.ai/favicon.ico | 200 | image/vnd.microsoft.icon | 0×0 | failed | 74 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| web | search-google | favicon.ico | https://www.google.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 33 | cross-origin | unauthenticated-http-probe | — |
| web | search-bing | favicon.ico | https://www.bing.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 34 | — | unauthenticated-http-probe | — |
| web | search-duckduckgo | favicon.ico | https://duckduckgo.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 84 | — | unauthenticated-http-probe | — |
| web | search-baidu | favicon.ico | https://www.baidu.com/favicon.ico | 200 | image/x-icon | 64×64 | loaded | 617 | — | unauthenticated-http-probe | — |
| web | mail-yahoo | favicon.ico | https://mail.yahoo.com/favicon.ico | 200 | image/vnd.microsoft.icon | 48×48 | loaded | 21 | — | unauthenticated-http-probe | — |
| web | mail-proton | favicon.ico | https://proton.me/favicon.ico | 200 | image/vnd.microsoft.icon | 48×48 | loaded | 345 | — | unauthenticated-http-probe | — |
| web | mail-icloud | favicon.ico | https://www.icloud.com/favicon.ico | 200 | image/x-icon | 48×48 | loaded | 21 | — | unauthenticated-http-probe | — |
| web | maps-apple | favicon.ico | https://maps.apple.com/favicon.ico | 200 | image/x-icon | 64×64 | loaded | 17 | — | unauthenticated-http-probe | — |
| web | maps-openstreetmap | favicon.ico | https://www.openstreetmap.org/favicon.ico | 200 | image/vnd.microsoft.icon | 48×48 | loaded | 307 | — | unauthenticated-http-probe | — |
| web | social-x | favicon.ico | https://x.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 69 | — | unauthenticated-http-probe | — |
| web | social-facebook | favicon.ico | https://www.facebook.com/favicon.ico | 200 | image/png | 60×60 | loaded | 46 | cross-origin | unauthenticated-http-probe | — |
| web | social-instagram | favicon.ico | https://www.instagram.com/favicon.ico | 200 | image/png | 0×0 | failed | 136 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| web | social-linkedin | favicon.ico | https://www.linkedin.com/favicon.ico | 200 | image/x-icon | 64×64 | loaded | 271 | — | unauthenticated-http-probe | — |
| web | social-weibo | favicon.ico | https://weibo.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 720 | — | unauthenticated-http-probe | — |
| web | video-bilibili | favicon.ico | https://www.bilibili.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 200 | — | unauthenticated-http-probe | — |
| web | video-netflix | favicon.ico | https://www.netflix.com/favicon.ico | 200 | image/x-icon | 64×64 | loaded | 91 | — | unauthenticated-http-probe | — |
| web | video-twitch | favicon.ico | https://www.twitch.tv/favicon.ico | 200 | application/octet-stream | 32×32 | loaded | 21 | — | unauthenticated-http-probe | content-type-application/octet-stream |
| web | ecommerce-ebay | favicon.ico | https://www.ebay.com/favicon.ico | 200 | image/x-icon | 16×16 | loaded | 51 | — | unauthenticated-http-probe | — |
| web | ecommerce-taobao | favicon.ico | https://www.taobao.com/favicon.ico | 200 | image/x-icon | 64×64 | loaded | 345 | — | unauthenticated-http-probe | — |
| web | ecommerce-jd | favicon.ico | https://www.jd.com/favicon.ico | 200 | image/x-icon | 48×48 | loaded | 32 | — | unauthenticated-http-probe | — |
| web | ai-gemini | favicon.ico | https://gemini.google.com/favicon.ico | 404 | text/html; charset=utf-8 | 0×0 | failed | 125 | — | unauthenticated-http-probe | image-decode-or-policy-error-http-404 |
| web | ai-perplexity | favicon.ico | https://www.perplexity.ai/favicon.ico | 200 | image/x-icon | 48×48 | loaded | 27 | cross-origin | unauthenticated-http-probe | — |
| web | ai-copilot | favicon.ico | https://copilot.microsoft.com/favicon.ico | 200 | image/vnd.microsoft.icon | 48×48 | loaded | 23 | — | unauthenticated-http-probe | — |
| web | ai-deepseek | favicon.ico | https://www.deepseek.com/favicon.ico | 200 | image/vnd.microsoft.icon | 225×225 | loaded | 20 | — | unauthenticated-http-probe | — |
| web | ai-kimi | favicon.ico | https://www.kimi.com/favicon.ico | 200 | — | 48×48 | loaded | 35 | — | unauthenticated-http-probe | — |
| web | dev-github | favicon.ico | https://github.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 62 | — | unauthenticated-http-probe | — |
| web | dev-gitlab | favicon.ico | https://gitlab.com/favicon.ico | 200 | image/png | 32×32 | loaded | 172 | — | unauthenticated-http-probe | — |
| web | dev-stackoverflow | favicon.ico | https://stackoverflow.com/favicon.ico | 200 | image/x-icon | 48×48 | loaded | 96 | — | unauthenticated-http-probe | — |
| web | dev-mdn | favicon.ico | https://developer.mozilla.org/favicon.ico | 200 | image/x-icon | 48×48 | loaded | 23 | — | unauthenticated-http-probe | — |
| web | dev-npm | favicon.ico | https://www.npmjs.com/favicon.ico | 403 | text/html; charset=UTF-8 | 0×0 | failed | 29 | same-origin | unauthenticated-http-probe | bot-challenge |
| web | dev-vercel | favicon.ico | https://vercel.com/favicon.ico | 200 | image/vnd.microsoft.icon | 48×48 | loaded | 56 | — | unauthenticated-http-probe | — |
| web | news-nytimes | favicon.ico | https://www.nytimes.com/favicon.ico | 200 | image/x-icon | 48×48 | loaded | 32 | — | unauthenticated-http-probe | — |
| web | news-bbc | favicon.ico | https://www.bbc.com/favicon.ico | 200 | image/vnd.microsoft.icon | 48×48 | loaded | 19 | — | unauthenticated-http-probe | — |
| web | news-cnn | favicon.ico | https://www.cnn.com/favicon.ico | 200 | image/x-icon | 0×0 | failed | 23 | — | unauthenticated-http-probe | image-decode-or-policy-error-http-200 |
| web | news-guardian | favicon.ico | https://www.theguardian.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 21 | — | unauthenticated-http-probe | — |
| web | office-notion | favicon.ico | https://www.notion.so/favicon.ico | 403 | text/html; charset=UTF-8 | 0×0 | failed | 49 | — | unauthenticated-http-probe | image-decode-or-policy-error-http-403 |
| web | office-google-docs | favicon.ico | https://docs.google.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 67 | cross-origin | unauthenticated-http-probe | — |
| web | office-microsoft | favicon.ico | https://www.office.com/favicon.ico | 200 | text/html; charset=utf-8 | 0×0 | failed | 363 | — | unauthenticated-http-probe | image-decode-or-policy-error-http-200 |
| web | cloud-google-drive | favicon.ico | https://drive.google.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 57 | cross-origin | unauthenticated-http-probe | — |
| web | cloud-dropbox | favicon.ico | https://www.dropbox.com/favicon.ico | 404 | text/html | 0×0 | failed | 29 | — | unauthenticated-http-probe | image-decode-or-policy-error-http-404 |
| web | cloud-onedrive | favicon.ico | https://onedrive.live.com/favicon.ico | 403 | — | 32×32 | loaded | 84 | — | unauthenticated-http-probe | — |
| web | music-spotify | favicon.ico | https://open.spotify.com/favicon.ico | 200 | image/vnd.microsoft.icon | 48×48 | loaded | 73 | — | unauthenticated-http-probe | — |
| web | music-soundcloud | favicon.ico | https://soundcloud.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 164 | — | unauthenticated-http-probe | — |
| web | music-bandcamp | favicon.ico | https://bandcamp.com/favicon.ico | 404 | — | 0×0 | failed | 72 | — | unauthenticated-http-probe | image-decode-or-policy-error-http-404 |
| web | education-coursera | favicon.ico | https://www.coursera.org/favicon.ico | 200 | image/x-icon | 48×48 | loaded | 917 | — | unauthenticated-http-probe | — |
| web | education-khan | favicon.ico | https://www.khanacademy.org/favicon.ico | 200 | image/vnd.microsoft.icon | 32×32 | loaded | 37 | — | unauthenticated-http-probe | — |
| web | education-arxiv | favicon.ico | https://arxiv.org/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 15 | — | unauthenticated-http-probe | — |
| web | travel-airbnb | favicon.ico | https://www.airbnb.com/favicon.ico | 200 | image/vnd.microsoft.icon | 32×32 | loaded | 439 | — | unauthenticated-http-probe | — |
| web | travel-booking | favicon.ico | https://www.booking.com/favicon.ico | 404 | text/html | 0×0 | failed | 188 | — | unauthenticated-http-probe | image-decode-or-policy-error-http-404 |
| web | travel-tripadvisor | favicon.ico | https://www.tripadvisor.com/favicon.ico | 200 | image/x-icon | 48×48 | loaded | 60 | — | unauthenticated-http-probe | — |
| web | finance-paypal | favicon.ico | https://www.paypal.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 52 | — | unauthenticated-http-probe | — |
| web | finance-stripe | favicon.ico | https://stripe.com/favicon.ico | 200 | image/vnd.microsoft.icon; charset=utf-8 | 48×48 | loaded | 170 | — | unauthenticated-http-probe | — |
| web | finance-coinbase | favicon.ico | https://www.coinbase.com/favicon.ico | 200 | image/vnd.microsoft.icon | 32×32 | loaded | 41 | — | unauthenticated-http-probe | — |
| web | messaging-whatsapp | favicon.ico | https://www.whatsapp.com/favicon.ico | 200 | image/png | 0×0 | failed | 32 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| web | messaging-telegram | favicon.ico | https://telegram.org/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 282 | — | unauthenticated-http-probe | — |
| web | messaging-discord | favicon.ico | https://discord.com/favicon.ico | 404 | text/html | 0×0 | failed | 82 | — | unauthenticated-http-probe | image-decode-or-policy-error-http-404 |
| web | productivity-trello | favicon.ico | https://trello.com/favicon.ico | 200 | image/vnd.microsoft.icon | 256×256 | loaded | 100 | — | unauthenticated-http-probe | — |
| web | productivity-asana | favicon.ico | https://asana.com/favicon.ico | 200 | image/vnd.microsoft.icon | 48×48 | loaded | 40 | — | unauthenticated-http-probe | — |
| web | productivity-linear | favicon.ico | https://linear.app/favicon.ico | 200 | image/x-icon | 48×48 | loaded | 41 | — | unauthenticated-http-probe | — |

## Category rates

| Category | Found | Clear |
|---|---:|---:|
| ai | 8/14 (57%) | 2/14 (14%) |
| cloud-storage | 4/6 (67%) | 0/6 (0%) |
| developer-tools | 10/12 (83%) | 0/12 (0%) |
| ecommerce | 8/8 (100%) | 0/8 (0%) |
| education | 6/6 (100%) | 0/6 (0%) |
| encyclopedia | 2/2 (100%) | 0/2 (0%) |
| finance | 6/6 (100%) | 0/6 (0%) |
| mail | 6/10 (60%) | 0/10 (0%) |
| maps | 5/6 (83%) | 0/6 (0%) |
| messaging | 2/6 (33%) | 0/6 (0%) |
| music | 4/6 (67%) | 0/6 (0%) |
| news | 6/8 (75%) | 0/8 (0%) |
| office | 2/6 (33%) | 0/6 (0%) |
| productivity | 6/6 (100%) | 2/6 (33%) |
| search | 8/8 (100%) | 0/8 (0%) |
| social | 10/12 (83%) | 0/12 (0%) |
| travel | 4/6 (67%) | 0/6 (0%) |
| video | 6/8 (75%) | 0/8 (0%) |

## Source rates

| Source | Found | Clear |
|---|---:|---:|
| favicon.ico | 103/103 (100%) | 4/103 (4%) |
| text-fallback | 0/33 (0%) | 0/33 (0%) |

## Platform limitations

- firefox-build: Error: browserType.launch:  ╔══════════════════════════════════════════════════════╗ ║ Host system is missing dependencies to run browsers. ║ ║ Please install them with the following command:      ║ ║                                                      ║ ║     sudo npx playwright install-deps                 ║ ║                                                      ║ ║ Alternatively, use apt:                              ║ ║     sudo apt-get install libgtk-3-0t64\              ║ ║         libcairo-gobject2\                           ║ ║         libgdk-pixbuf-2.0-0                          ║ ║                                                      ║ ║ <3 Playwright Team                                   ║ ╚══════════════════════════════════════════════════════╝
