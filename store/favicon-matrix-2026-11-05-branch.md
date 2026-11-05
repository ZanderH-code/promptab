# Favicon quality matrix: branch

- Run date: 2026-11-05
- Source commit: a9d2b21-dirty
- Environment: linux 6.17.0-1020-oracle arm64; Chromium 156.0.8078.4; Firefox unavailable
- Matrix sites: 68; display size: 72px; DPR: 1
- External access is best-effort and time-sensitive; this report is not a CI gate. Browser image load and unauthenticated HTTP header probes are recorded separately.

## Summary

| Platform | Hit rate | Clear rate |
|---|---:|---:|
| chromium-extension | 56/68 (82%) | 16/68 (24%) |
| web | 54/68 (79%) | 14/68 (21%) |
| firefox-build | 0/0 (0%) | 0/0 (0%) |

## Per-site final result

| Platform | ID | Category | Found | Source type | Source URL | Natural size | Clarity | Failure |
|---|---|---|---:|---|---|---:|---|---|
| chromium-extension | starter-youtube | video | yes | favicon.ico | https://www.youtube.com/favicon.ico | 16×16 | blurry | — |
| chromium-extension | starter-gmail | mail | no | text-fallback | — | 0×0 | not-found | default-globe-placeholder |
| chromium-extension | starter-maps | maps | yes | favicon.ico | https://maps.google.com/favicon.ico | 32×32 | blurry | — |
| chromium-extension | starter-wikipedia | encyclopedia | yes | apple-touch-icon | https://www.wikipedia.org/apple-touch-icon.png | 160×160 | clear | — |
| chromium-extension | starter-reddit | social | yes | apple-touch-icon-precomposed | https://www.reddit.com/apple-touch-icon-precomposed.png | 128×128 | clear | — |
| chromium-extension | starter-amazon | ecommerce | yes | favicon.ico | https://www.amazon.com/favicon.ico | 48×48 | blurry | — |
| chromium-extension | starter-chatgpt | ai | yes | favicon.ico | https://chatgpt.com/favicon.ico | 64×64 | blurry | — |
| chromium-extension | starter-outlook | mail | no | text-fallback | — | 0×0 | not-found | default-globe-placeholder |
| chromium-extension | claude-new | ai | yes | apple-touch-icon | https://claude.ai/apple-touch-icon.png | 180×180 | clear | — |
| chromium-extension | search-google | search | yes | favicon.ico | https://www.google.com/favicon.ico | 32×32 | blurry | — |
| chromium-extension | search-bing | search | yes | apple-touch-icon | https://www.bing.com/apple-touch-icon.png | 57×57 | blurry | — |
| chromium-extension | search-duckduckgo | search | yes | favicon.ico | https://duckduckgo.com/favicon.ico | 32×32 | blurry | — |
| chromium-extension | search-baidu | search | yes | favicon.ico | https://www.baidu.com/favicon.ico | 64×64 | blurry | — |
| chromium-extension | mail-yahoo | mail | yes | favicon.ico | https://mail.yahoo.com/favicon.ico | 48×48 | blurry | — |
| chromium-extension | mail-proton | mail | yes | favicon.ico | https://proton.me/favicon.ico | 48×48 | blurry | — |
| chromium-extension | mail-icloud | mail | yes | favicon.ico | https://www.icloud.com/favicon.ico | 48×48 | blurry | — |
| chromium-extension | maps-apple | maps | yes | favicon.ico | https://maps.apple.com/favicon.ico | 64×64 | blurry | — |
| chromium-extension | maps-openstreetmap | maps | yes | favicon.ico | https://www.openstreetmap.org/favicon.ico | 48×48 | blurry | — |
| chromium-extension | social-x | social | yes | favicon.ico | https://x.com/favicon.ico | 32×32 | blurry | — |
| chromium-extension | social-facebook | social | yes | apple-touch-icon | https://www.facebook.com/apple-touch-icon.png | 180×180 | clear | — |
| chromium-extension | social-instagram | social | no | text-fallback | — | 0×0 | not-found | default-globe-placeholder |
| chromium-extension | social-linkedin | social | yes | favicon.ico | https://www.linkedin.com/favicon.ico | 64×64 | blurry | — |
| chromium-extension | social-weibo | social | yes | favicon.ico | https://weibo.com/favicon.ico | 32×32 | blurry | — |
| chromium-extension | video-bilibili | video | yes | favicon.ico | https://www.bilibili.com/favicon.ico | 32×32 | blurry | — |
| chromium-extension | video-netflix | video | yes | favicon.ico | https://www.netflix.com/favicon.ico | 64×64 | blurry | — |
| chromium-extension | video-twitch | video | yes | apple-touch-icon | https://www.twitch.tv/apple-touch-icon.png | 180×180 | clear | — |
| chromium-extension | ecommerce-ebay | ecommerce | yes | apple-touch-icon | https://www.ebay.com/apple-touch-icon.png | 60×60 | blurry | — |
| chromium-extension | ecommerce-taobao | ecommerce | yes | favicon.ico | https://www.taobao.com/favicon.ico | 64×64 | blurry | — |
| chromium-extension | ecommerce-jd | ecommerce | yes | favicon.ico | https://www.jd.com/favicon.ico | 48×48 | blurry | — |
| chromium-extension | ai-gemini | ai | no | text-fallback | — | 0×0 | not-found | default-globe-placeholder |
| chromium-extension | ai-perplexity | ai | yes | favicon.svg | https://www.perplexity.ai/favicon.svg | 360×360 | clear | — |
| chromium-extension | ai-copilot | ai | yes | favicon.ico | https://copilot.microsoft.com/favicon.ico | 48×48 | blurry | — |
| chromium-extension | ai-deepseek | ai | yes | favicon.ico | https://www.deepseek.com/favicon.ico | 225×225 | clear | — |
| chromium-extension | ai-kimi | ai | yes | favicon.ico | https://www.kimi.com/favicon.ico | 48×48 | blurry | — |
| chromium-extension | dev-github | developer-tools | yes | apple-touch-icon | https://github.com/apple-touch-icon.png | 120×120 | clear | — |
| chromium-extension | dev-gitlab | developer-tools | yes | apple-touch-icon | https://gitlab.com/apple-touch-icon.png | 180×180 | clear | — |
| chromium-extension | dev-stackoverflow | developer-tools | yes | apple-touch-icon | https://stackoverflow.com/apple-touch-icon.png | 180×180 | clear | — |
| chromium-extension | dev-mdn | developer-tools | yes | favicon.svg | https://developer.mozilla.org/favicon.svg | 56×56 | clear | — |
| chromium-extension | dev-npm | developer-tools | no | text-fallback | — | 0×0 | not-found | default-globe-placeholder |
| chromium-extension | dev-vercel | developer-tools | yes | apple-touch-icon | https://vercel.com/apple-touch-icon.png | 180×180 | clear | — |
| chromium-extension | news-nytimes | news | yes | favicon.ico | https://www.nytimes.com/favicon.ico | 48×48 | blurry | — |
| chromium-extension | news-bbc | news | yes | apple-touch-icon | https://www.bbc.com/apple-touch-icon.png | 57×57 | blurry | — |
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
| chromium-extension | travel-airbnb | travel | yes | apple-touch-icon-precomposed | https://www.airbnb.com/apple-touch-icon-precomposed.png | 58×58 | blurry | — |
| chromium-extension | travel-booking | travel | yes | apple-touch-icon | https://www.booking.com/apple-touch-icon.png | 180×180 | clear | — |
| chromium-extension | travel-tripadvisor | travel | yes | apple-touch-icon | https://www.tripadvisor.com/apple-touch-icon.png | 180×180 | clear | — |
| chromium-extension | finance-paypal | finance | yes | favicon.ico | https://www.paypal.com/favicon.ico | 32×32 | blurry | — |
| chromium-extension | finance-stripe | finance | yes | favicon.ico | https://stripe.com/favicon.ico | 48×48 | blurry | — |
| chromium-extension | finance-coinbase | finance | yes | apple-touch-icon | https://www.coinbase.com/apple-touch-icon.png | 512×512 | clear | — |
| chromium-extension | messaging-whatsapp | messaging | no | text-fallback | — | 0×0 | not-found | default-globe-placeholder |
| chromium-extension | messaging-telegram | messaging | yes | favicon.ico | https://telegram.org/favicon.ico | 32×32 | blurry | — |
| chromium-extension | messaging-discord | messaging | no | text-fallback | — | 0×0 | not-found | default-globe-placeholder |
| chromium-extension | productivity-trello | productivity | yes | favicon.ico | https://trello.com/favicon.ico | 256×256 | clear | — |
| chromium-extension | productivity-asana | productivity | yes | favicon.ico | https://asana.com/favicon.ico | 48×48 | blurry | — |
| chromium-extension | productivity-linear | productivity | yes | favicon.ico | https://linear.app/favicon.ico | 48×48 | blurry | — |
| web | starter-youtube | video | yes | favicon.ico | https://www.youtube.com/favicon.ico | 16×16 | blurry | — |
| web | starter-gmail | mail | no | text-fallback | — | 0×0 | not-found | net::ERR_BLOCKED_BY_ORB |
| web | starter-maps | maps | yes | favicon.ico | https://maps.google.com/favicon.ico | 32×32 | blurry | — |
| web | starter-wikipedia | encyclopedia | yes | apple-touch-icon | https://www.wikipedia.org/apple-touch-icon.png | 160×160 | clear | — |
| web | starter-reddit | social | yes | apple-touch-icon-precomposed | https://www.reddit.com/apple-touch-icon-precomposed.png | 128×128 | clear | — |
| web | starter-amazon | ecommerce | yes | favicon.ico | https://www.amazon.com/favicon.ico | 48×48 | blurry | — |
| web | starter-chatgpt | ai | yes | favicon.ico | https://chatgpt.com/favicon.ico | 64×64 | blurry | — |
| web | starter-outlook | mail | no | text-fallback | — | 0×0 | not-found | net::ERR_BLOCKED_BY_ORB |
| web | claude-new | ai | yes | apple-touch-icon | https://claude.ai/apple-touch-icon.png | 180×180 | clear | — |
| web | search-google | search | yes | favicon.ico | https://www.google.com/favicon.ico | 32×32 | blurry | — |
| web | search-bing | search | yes | apple-touch-icon | https://www.bing.com/apple-touch-icon.png | 57×57 | blurry | — |
| web | search-duckduckgo | search | yes | favicon.ico | https://duckduckgo.com/favicon.ico | 32×32 | blurry | — |
| web | search-baidu | search | yes | favicon.ico | https://www.baidu.com/favicon.ico | 64×64 | blurry | — |
| web | mail-yahoo | mail | yes | favicon.ico | https://mail.yahoo.com/favicon.ico | 48×48 | blurry | — |
| web | mail-proton | mail | yes | favicon.ico | https://proton.me/favicon.ico | 48×48 | blurry | — |
| web | mail-icloud | mail | yes | favicon.ico | https://www.icloud.com/favicon.ico | 48×48 | blurry | — |
| web | maps-apple | maps | yes | favicon.ico | https://maps.apple.com/favicon.ico | 64×64 | blurry | — |
| web | maps-openstreetmap | maps | yes | favicon.ico | https://www.openstreetmap.org/favicon.ico | 48×48 | blurry | — |
| web | social-x | social | yes | favicon.ico | https://x.com/favicon.ico | 32×32 | blurry | — |
| web | social-facebook | social | yes | apple-touch-icon | https://www.facebook.com/apple-touch-icon.png | 180×180 | clear | — |
| web | social-instagram | social | no | text-fallback | — | 0×0 | not-found | blocked-by-corp-same-origin |
| web | social-linkedin | social | yes | favicon.ico | https://www.linkedin.com/favicon.ico | 64×64 | blurry | — |
| web | social-weibo | social | yes | favicon.ico | https://weibo.com/favicon.ico | 32×32 | blurry | — |
| web | video-bilibili | video | yes | favicon.ico | https://www.bilibili.com/favicon.ico | 32×32 | blurry | — |
| web | video-netflix | video | yes | favicon.ico | https://www.netflix.com/favicon.ico | 64×64 | blurry | — |
| web | video-twitch | video | yes | apple-touch-icon | https://www.twitch.tv/apple-touch-icon.png | 180×180 | clear | — |
| web | ecommerce-ebay | ecommerce | yes | apple-touch-icon | https://www.ebay.com/apple-touch-icon.png | 60×60 | blurry | — |
| web | ecommerce-taobao | ecommerce | yes | favicon.ico | https://www.taobao.com/favicon.ico | 64×64 | blurry | — |
| web | ecommerce-jd | ecommerce | yes | favicon.ico | https://www.jd.com/favicon.ico | 48×48 | blurry | — |
| web | ai-gemini | ai | no | text-fallback | — | 0×0 | not-found | net::ERR_BLOCKED_BY_ORB |
| web | ai-perplexity | ai | yes | favicon.svg | https://www.perplexity.ai/favicon.svg | 360×360 | clear | — |
| web | ai-copilot | ai | yes | favicon.ico | https://copilot.microsoft.com/favicon.ico | 48×48 | blurry | — |
| web | ai-deepseek | ai | no | text-fallback | — | 0×0 | not-found | net::ERR_BLOCKED_BY_ORB |
| web | ai-kimi | ai | yes | favicon.ico | https://www.kimi.com/favicon.ico | 48×48 | blurry | — |
| web | dev-github | developer-tools | yes | apple-touch-icon | https://github.com/apple-touch-icon.png | 120×120 | clear | — |
| web | dev-gitlab | developer-tools | yes | apple-touch-icon | https://gitlab.com/apple-touch-icon.png | 180×180 | clear | — |
| web | dev-stackoverflow | developer-tools | no | text-fallback | — | 0×0 | not-found | bot-challenge |
| web | dev-mdn | developer-tools | yes | favicon.svg | https://developer.mozilla.org/favicon.svg | 56×56 | clear | — |
| web | dev-npm | developer-tools | no | text-fallback | — | 0×0 | not-found | bot-challenge |
| web | dev-vercel | developer-tools | yes | apple-touch-icon | https://vercel.com/apple-touch-icon.png | 180×180 | clear | — |
| web | news-nytimes | news | yes | favicon.ico | https://www.nytimes.com/favicon.ico | 48×48 | blurry | — |
| web | news-bbc | news | yes | apple-touch-icon | https://www.bbc.com/apple-touch-icon.png | 57×57 | blurry | — |
| web | news-cnn | news | no | text-fallback | — | 0×0 | not-found | image-decode-or-policy-error-http-404 |
| web | news-guardian | news | yes | favicon.ico | https://www.theguardian.com/favicon.ico | 32×32 | blurry | — |
| web | office-notion | office | no | text-fallback | — | 0×0 | not-found | net::ERR_BLOCKED_BY_ORB |
| web | office-google-docs | office | yes | favicon.ico | https://docs.google.com/favicon.ico | 32×32 | blurry | — |
| web | office-microsoft | office | no | text-fallback | — | 0×0 | not-found | net::ERR_BLOCKED_BY_ORB |
| web | cloud-google-drive | cloud-storage | yes | favicon.ico | https://drive.google.com/favicon.ico | 32×32 | blurry | — |
| web | cloud-dropbox | cloud-storage | no | text-fallback | — | 0×0 | not-found | net::ERR_BLOCKED_BY_ORB |
| web | cloud-onedrive | cloud-storage | yes | favicon.ico | https://onedrive.live.com/favicon.ico | 32×32 | blurry | — |
| web | music-spotify | music | yes | favicon.ico | https://open.spotify.com/favicon.ico | 48×48 | blurry | — |
| web | music-soundcloud | music | yes | favicon.ico | https://soundcloud.com/favicon.ico | 32×32 | blurry | — |
| web | music-bandcamp | music | no | text-fallback | — | 0×0 | not-found | net::ERR_BLOCKED_BY_ORB |
| web | education-coursera | education | yes | favicon.ico | https://www.coursera.org/favicon.ico | 48×48 | blurry | — |
| web | education-khan | education | yes | favicon.ico | https://www.khanacademy.org/favicon.ico | 32×32 | blurry | — |
| web | education-arxiv | education | yes | favicon.ico | https://arxiv.org/favicon.ico | 32×32 | blurry | — |
| web | travel-airbnb | travel | yes | apple-touch-icon-precomposed | https://www.airbnb.com/apple-touch-icon-precomposed.png | 58×58 | blurry | — |
| web | travel-booking | travel | yes | apple-touch-icon | https://www.booking.com/apple-touch-icon.png | 180×180 | clear | — |
| web | travel-tripadvisor | travel | yes | apple-touch-icon | https://www.tripadvisor.com/apple-touch-icon.png | 180×180 | clear | — |
| web | finance-paypal | finance | yes | favicon.ico | https://www.paypal.com/favicon.ico | 32×32 | blurry | — |
| web | finance-stripe | finance | yes | favicon.ico | https://stripe.com/favicon.ico | 48×48 | blurry | — |
| web | finance-coinbase | finance | yes | apple-touch-icon | https://www.coinbase.com/apple-touch-icon.png | 512×512 | clear | — |
| web | messaging-whatsapp | messaging | no | text-fallback | — | 0×0 | not-found | blocked-by-corp-same-origin |
| web | messaging-telegram | messaging | yes | favicon.ico | https://telegram.org/favicon.ico | 32×32 | blurry | — |
| web | messaging-discord | messaging | no | text-fallback | — | 0×0 | not-found | net::ERR_BLOCKED_BY_ORB |
| web | productivity-trello | productivity | yes | favicon.ico | https://trello.com/favicon.ico | 256×256 | clear | — |
| web | productivity-asana | productivity | yes | favicon.ico | https://asana.com/favicon.ico | 48×48 | blurry | — |
| web | productivity-linear | productivity | yes | favicon.ico | https://linear.app/favicon.ico | 48×48 | blurry | — |

## Candidate diagnostics

| Platform | ID | Candidate | URL | HTTP | Content type | Natural size | Browser image | Time ms | CORP | Metadata source | Failure |
|---|---|---|---|---:|---|---:|---|---:|---|---|---|
| chromium-extension | starter-youtube | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.youtube.com%2F&size=128 | 200 | — | 64×64 | loaded | 42 | — | browser | default-globe-placeholder |
| chromium-extension | starter-youtube | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.youtube.com%2F&size=64 | 200 | — | 64×64 | loaded | 60 | — | browser | default-globe-placeholder |
| chromium-extension | starter-youtube | apple-touch-icon | https://www.youtube.com/apple-touch-icon.png | 404 | text/html; charset=ISO-8859-1 | 0×0 | failed | 540 | cross-origin | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | starter-youtube | apple-touch-icon-precomposed | https://www.youtube.com/apple-touch-icon-precomposed.png | 404 | text/html; charset=ISO-8859-1 | 0×0 | failed | 33 | cross-origin | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | starter-youtube | favicon.svg | https://www.youtube.com/favicon.svg | 404 | text/html; charset=utf-8 | 0×0 | failed | 86 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | starter-youtube | favicon-32x32.png | https://www.youtube.com/favicon-32x32.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 132 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | starter-youtube | favicon.ico | https://www.youtube.com/favicon.ico | 200 | image/x-icon | 16×16 | loaded | 26 | cross-origin | unauthenticated-http-probe | — |
| chromium-extension | starter-gmail | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fmail.google.com%2F&size=128 | 200 | — | 64×64 | loaded | 53 | — | browser | default-globe-placeholder |
| chromium-extension | starter-gmail | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fmail.google.com%2F&size=64 | 200 | — | 64×64 | loaded | 70 | — | browser | default-globe-placeholder |
| chromium-extension | starter-gmail | apple-touch-icon | https://mail.google.com/apple-touch-icon.png | 301 | text/html; charset=UTF-8 | 0×0 | failed | 229 | cross-origin | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | starter-gmail | apple-touch-icon-precomposed | https://mail.google.com/apple-touch-icon-precomposed.png | 301 | text/html; charset=UTF-8 | 0×0 | failed | 151 | cross-origin | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | starter-gmail | favicon.svg | https://mail.google.com/favicon.svg | 301 | text/html; charset=UTF-8 | 0×0 | failed | 170 | cross-origin | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | starter-gmail | favicon-32x32.png | https://mail.google.com/favicon-32x32.png | 301 | text/html; charset=UTF-8 | 0×0 | failed | 171 | cross-origin | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | starter-gmail | favicon.ico | https://mail.google.com/favicon.ico | 200 | image/x-icon | 0×0 | failed | 124 | cross-origin | unauthenticated-http-probe | image-decode-or-policy-error-http-200 |
| chromium-extension | starter-maps | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fmaps.google.com%2F&size=128 | 200 | — | 64×64 | loaded | 28 | — | browser | default-globe-placeholder |
| chromium-extension | starter-maps | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fmaps.google.com%2F&size=64 | 200 | — | 64×64 | loaded | 38 | — | browser | default-globe-placeholder |
| chromium-extension | starter-maps | apple-touch-icon | https://maps.google.com/apple-touch-icon.png | 404 | text/html; charset=UTF-8 | 0×0 | failed | 202 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | starter-maps | apple-touch-icon-precomposed | https://maps.google.com/apple-touch-icon-precomposed.png | 404 | text/html; charset=UTF-8 | 0×0 | failed | 126 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | starter-maps | favicon.svg | https://maps.google.com/favicon.svg | 404 | text/html; charset=UTF-8 | 0×0 | failed | 135 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | starter-maps | favicon-32x32.png | https://maps.google.com/favicon-32x32.png | 404 | text/html; charset=UTF-8 | 0×0 | failed | 113 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | starter-maps | favicon.ico | https://maps.google.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 33 | cross-origin | unauthenticated-http-probe | — |
| chromium-extension | starter-wikipedia | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.wikipedia.org%2F&size=128 | 200 | — | 64×64 | loaded | 25 | — | browser | default-globe-placeholder |
| chromium-extension | starter-wikipedia | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.wikipedia.org%2F&size=64 | 200 | — | 64×64 | loaded | 11 | — | browser | default-globe-placeholder |
| chromium-extension | starter-wikipedia | apple-touch-icon | https://www.wikipedia.org/apple-touch-icon.png | 200 | image/png | 160×160 | loaded | 260 | — | browser | — |
| chromium-extension | starter-wikipedia | apple-touch-icon-precomposed | https://www.wikipedia.org/apple-touch-icon-precomposed.png | 301 | text/html; charset=iso-8859-1 | 0×0 | failed | 74 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | starter-wikipedia | favicon.svg | https://www.wikipedia.org/favicon.svg | 301 | text/html; charset=iso-8859-1 | 0×0 | failed | 71 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | starter-wikipedia | favicon-32x32.png | https://www.wikipedia.org/favicon-32x32.png | 301 | text/html; charset=iso-8859-1 | 0×0 | failed | 64 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | starter-wikipedia | favicon.ico | https://www.wikipedia.org/favicon.ico | 200 | image/vnd.microsoft.icon | 48×48 | loaded | 82 | — | unauthenticated-http-probe | — |
| chromium-extension | starter-reddit | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.reddit.com%2F&size=128 | 200 | — | 64×64 | loaded | 10 | — | browser | default-globe-placeholder |
| chromium-extension | starter-reddit | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.reddit.com%2F&size=64 | 200 | — | 64×64 | loaded | 5 | — | browser | default-globe-placeholder |
| chromium-extension | starter-reddit | apple-touch-icon | https://www.reddit.com/apple-touch-icon.png | 200 | image/png | 57×57 | loaded | 65 | — | browser | — |
| chromium-extension | starter-reddit | apple-touch-icon-precomposed | https://www.reddit.com/apple-touch-icon-precomposed.png | 200 | image/png | 128×128 | loaded | 51 | — | browser | — |
| chromium-extension | starter-reddit | favicon.svg | https://www.reddit.com/favicon.svg | 403 | application/xml | 0×0 | failed | 88 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | starter-reddit | favicon-32x32.png | https://www.reddit.com/favicon-32x32.png | 403 | application/xml | 0×0 | failed | 118 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | starter-reddit | favicon.ico | https://www.reddit.com/favicon.ico | 200 | image/vnd.microsoft.icon | 32×32 | loaded | 21 | — | unauthenticated-http-probe | — |
| chromium-extension | starter-amazon | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.amazon.com%2F&size=128 | 200 | — | 64×64 | loaded | 12 | — | browser | default-globe-placeholder |
| chromium-extension | starter-amazon | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.amazon.com%2F&size=64 | 200 | — | 64×64 | loaded | 11 | — | browser | default-globe-placeholder |
| chromium-extension | starter-amazon | apple-touch-icon | https://www.amazon.com/apple-touch-icon.png | 404 | text/html;charset=UTF-8 | 0×0 | failed | 195 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | starter-amazon | apple-touch-icon-precomposed | https://www.amazon.com/apple-touch-icon-precomposed.png | 404 | text/html;charset=UTF-8 | 0×0 | failed | 166 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | starter-amazon | favicon.svg | https://www.amazon.com/favicon.svg | 404 | text/html;charset=UTF-8 | 0×0 | failed | 101 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | starter-amazon | favicon-32x32.png | https://www.amazon.com/favicon-32x32.png | 404 | text/html;charset=UTF-8 | 0×0 | failed | 101 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | starter-amazon | favicon.ico | https://www.amazon.com/favicon.ico | 200 | image/x-icon | 48×48 | loaded | 60 | — | unauthenticated-http-probe | — |
| chromium-extension | starter-chatgpt | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fchatgpt.com%2F&size=128 | 200 | — | 64×64 | loaded | 13 | — | browser | default-globe-placeholder |
| chromium-extension | starter-chatgpt | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fchatgpt.com%2F&size=64 | 200 | — | 64×64 | loaded | 7 | — | browser | default-globe-placeholder |
| chromium-extension | starter-chatgpt | apple-touch-icon | https://chatgpt.com/apple-touch-icon.png | 404 | — | 0×0 | failed | 85 | — | browser | image-decode-or-policy-error-http-404 |
| chromium-extension | starter-chatgpt | apple-touch-icon-precomposed | https://chatgpt.com/apple-touch-icon-precomposed.png | 404 | — | 0×0 | failed | 30 | — | browser | image-decode-or-policy-error-http-404 |
| chromium-extension | starter-chatgpt | favicon.svg | https://chatgpt.com/favicon.svg | 404 | — | 0×0 | failed | 100 | — | browser | image-decode-or-policy-error-http-404 |
| chromium-extension | starter-chatgpt | favicon-32x32.png | https://chatgpt.com/favicon-32x32.png | 404 | — | 0×0 | failed | 51 | — | browser | image-decode-or-policy-error-http-404 |
| chromium-extension | starter-chatgpt | favicon.ico | https://chatgpt.com/favicon.ico | 200 | image/x-icon | 64×64 | loaded | 117 | — | unauthenticated-http-probe | — |
| chromium-extension | starter-outlook | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Foutlook.live.com%2F&size=128 | 200 | — | 64×64 | loaded | 7 | — | browser | default-globe-placeholder |
| chromium-extension | starter-outlook | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Foutlook.live.com%2F&size=64 | 200 | — | 64×64 | loaded | 24 | — | browser | default-globe-placeholder |
| chromium-extension | starter-outlook | apple-touch-icon | https://outlook.live.com/apple-touch-icon.png | 302 | text/plain | 0×0 | failed | 137 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | starter-outlook | apple-touch-icon-precomposed | https://outlook.live.com/apple-touch-icon-precomposed.png | 302 | text/plain | 0×0 | failed | 84 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | starter-outlook | favicon.svg | https://outlook.live.com/favicon.svg | 302 | text/plain | 0×0 | failed | 45 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | starter-outlook | favicon-32x32.png | https://outlook.live.com/favicon-32x32.png | 302 | text/plain | 0×0 | failed | 110 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | starter-outlook | favicon.ico | https://outlook.live.com/favicon.ico | 200 | text/html | 0×0 | failed | 42 | — | unauthenticated-http-probe | image-decode-or-policy-error-http-200 |
| chromium-extension | claude-new | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fclaude.ai%2Fnew&size=128 | 200 | — | 64×64 | loaded | 48 | — | browser | default-globe-placeholder |
| chromium-extension | claude-new | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fclaude.ai%2Fnew&size=64 | 200 | — | 64×64 | loaded | 20 | — | browser | default-globe-placeholder |
| chromium-extension | claude-new | apple-touch-icon | https://claude.ai/apple-touch-icon.png | 200 | image/png | 180×180 | loaded | 68 | cross-origin | browser | — |
| chromium-extension | claude-new | apple-touch-icon-precomposed | https://claude.ai/apple-touch-icon-precomposed.png | 404 | text/plain; charset=UTF-8 | 0×0 | failed | 27 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| chromium-extension | claude-new | favicon.svg | https://claude.ai/favicon.svg | 200 | image/svg+xml | 0×0 | failed | 40 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| chromium-extension | claude-new | favicon-32x32.png | https://claude.ai/favicon-32x32.png | 200 | image/png | 0×0 | failed | 23 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| chromium-extension | claude-new | favicon.ico | https://claude.ai/favicon.ico | 200 | image/vnd.microsoft.icon | 0×0 | failed | 28 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| chromium-extension | search-google | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.google.com%2F&size=128 | 200 | — | 64×64 | loaded | 13 | — | browser | default-globe-placeholder |
| chromium-extension | search-google | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.google.com%2F&size=64 | 200 | — | 64×64 | loaded | 15 | — | browser | default-globe-placeholder |
| chromium-extension | search-google | apple-touch-icon | https://www.google.com/apple-touch-icon.png | 404 | text/html; charset=UTF-8 | 0×0 | failed | 107 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | search-google | apple-touch-icon-precomposed | https://www.google.com/apple-touch-icon-precomposed.png | 404 | text/html; charset=UTF-8 | 0×0 | failed | 107 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | search-google | favicon.svg | https://www.google.com/favicon.svg | 404 | text/html; charset=UTF-8 | 0×0 | failed | 119 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | search-google | favicon-32x32.png | https://www.google.com/favicon-32x32.png | 404 | text/html; charset=UTF-8 | 0×0 | failed | 109 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | search-google | favicon.ico | https://www.google.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 9 | cross-origin | unauthenticated-http-probe | — |
| chromium-extension | search-bing | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.bing.com%2F&size=128 | 200 | — | 64×64 | loaded | 16 | — | browser | default-globe-placeholder |
| chromium-extension | search-bing | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.bing.com%2F&size=64 | 200 | — | 64×64 | loaded | 6 | — | browser | default-globe-placeholder |
| chromium-extension | search-bing | apple-touch-icon | https://www.bing.com/apple-touch-icon.png | 200 | image/png | 57×57 | loaded | 36 | — | browser | — |
| chromium-extension | search-bing | apple-touch-icon-precomposed | https://www.bing.com/apple-touch-icon-precomposed.png | 200 | image/png | 57×57 | loaded | 42 | — | browser | — |
| chromium-extension | search-bing | favicon.svg | https://www.bing.com/favicon.svg | 404 | text/html | 0×0 | failed | 126 | — | browser | image-decode-or-policy-error-http-404 |
| chromium-extension | search-bing | favicon-32x32.png | https://www.bing.com/favicon-32x32.png | 404 | text/html | 0×0 | failed | 178 | — | browser | image-decode-or-policy-error-http-404 |
| chromium-extension | search-bing | favicon.ico | https://www.bing.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 23 | — | unauthenticated-http-probe | — |
| chromium-extension | search-duckduckgo | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fduckduckgo.com%2F&size=128 | 200 | — | 64×64 | loaded | 5 | — | browser | default-globe-placeholder |
| chromium-extension | search-duckduckgo | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fduckduckgo.com%2F&size=64 | 200 | — | 64×64 | loaded | 2 | — | browser | default-globe-placeholder |
| chromium-extension | search-duckduckgo | apple-touch-icon | https://duckduckgo.com/apple-touch-icon.png | 410 | text/html; charset=UTF-8 | 0×0 | failed | 114 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | search-duckduckgo | apple-touch-icon-precomposed | https://duckduckgo.com/apple-touch-icon-precomposed.png | 410 | text/html; charset=UTF-8 | 0×0 | failed | 42 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | search-duckduckgo | favicon.svg | https://duckduckgo.com/favicon.svg | 410 | text/html; charset=UTF-8 | 0×0 | failed | 38 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | search-duckduckgo | favicon-32x32.png | https://duckduckgo.com/favicon-32x32.png | 410 | text/html; charset=UTF-8 | 0×0 | failed | 33 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | search-duckduckgo | favicon.ico | https://duckduckgo.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 39 | — | unauthenticated-http-probe | — |
| chromium-extension | search-baidu | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.baidu.com%2F&size=128 | 200 | — | 64×64 | loaded | 12 | — | browser | default-globe-placeholder |
| chromium-extension | search-baidu | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.baidu.com%2F&size=64 | 200 | — | 64×64 | loaded | 3 | — | browser | default-globe-placeholder |
| chromium-extension | search-baidu | apple-touch-icon | https://www.baidu.com/apple-touch-icon.png | 404 | text/html; charset=iso-8859-1 | 0×0 | failed | 839 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | search-baidu | apple-touch-icon-precomposed | https://www.baidu.com/apple-touch-icon-precomposed.png | 404 | text/html; charset=iso-8859-1 | 0×0 | failed | 663 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | search-baidu | favicon.svg | https://www.baidu.com/favicon.svg | 404 | text/html; charset=iso-8859-1 | 0×0 | failed | 611 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | search-baidu | favicon-32x32.png | https://www.baidu.com/favicon-32x32.png | 404 | text/html; charset=iso-8859-1 | 0×0 | failed | 629 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | search-baidu | favicon.ico | https://www.baidu.com/favicon.ico | 200 | image/x-icon | 64×64 | loaded | 630 | — | unauthenticated-http-probe | — |
| chromium-extension | mail-yahoo | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fmail.yahoo.com%2F&size=128 | 200 | — | 64×64 | loaded | 7 | — | browser | default-globe-placeholder |
| chromium-extension | mail-yahoo | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fmail.yahoo.com%2F&size=64 | 200 | — | 64×64 | loaded | 4 | — | browser | default-globe-placeholder |
| chromium-extension | mail-yahoo | apple-touch-icon | https://mail.yahoo.com/apple-touch-icon.png | 404 | text/html | 0×0 | failed | 77 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | mail-yahoo | apple-touch-icon-precomposed | https://mail.yahoo.com/apple-touch-icon-precomposed.png | 404 | text/html | 0×0 | failed | 81 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | mail-yahoo | favicon.svg | https://mail.yahoo.com/favicon.svg | 302 | text/plain; charset=utf-8 | 0×0 | failed | 156 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | mail-yahoo | favicon-32x32.png | https://mail.yahoo.com/favicon-32x32.png | 302 | text/plain; charset=utf-8 | 0×0 | failed | 171 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | mail-yahoo | favicon.ico | https://mail.yahoo.com/favicon.ico | 200 | image/vnd.microsoft.icon | 48×48 | loaded | 25 | — | unauthenticated-http-probe | — |
| chromium-extension | mail-proton | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fproton.me%2F&size=128 | 200 | — | 64×64 | loaded | 8 | — | browser | default-globe-placeholder |
| chromium-extension | mail-proton | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fproton.me%2F&size=64 | 200 | — | 64×64 | loaded | 5 | — | browser | default-globe-placeholder |
| chromium-extension | mail-proton | apple-touch-icon | https://proton.me/apple-touch-icon.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 674 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | mail-proton | apple-touch-icon-precomposed | https://proton.me/apple-touch-icon-precomposed.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 143 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | mail-proton | favicon.svg | https://proton.me/favicon.svg | 404 | text/html; charset=utf-8 | 0×0 | failed | 132 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | mail-proton | favicon-32x32.png | https://proton.me/favicon-32x32.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 148 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | mail-proton | favicon.ico | https://proton.me/favicon.ico | 200 | image/vnd.microsoft.icon | 48×48 | loaded | 129 | — | unauthenticated-http-probe | — |
| chromium-extension | mail-icloud | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.icloud.com%2Fmail&size=128 | 200 | — | 64×64 | loaded | 12 | — | browser | default-globe-placeholder |
| chromium-extension | mail-icloud | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.icloud.com%2Fmail&size=64 | 200 | — | 64×64 | loaded | 6 | — | browser | default-globe-placeholder |
| chromium-extension | mail-icloud | apple-touch-icon | https://www.icloud.com/apple-touch-icon.png | 404 | text/html | 0×0 | failed | 99 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | mail-icloud | apple-touch-icon-precomposed | https://www.icloud.com/apple-touch-icon-precomposed.png | 404 | text/html | 0×0 | failed | 77 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | mail-icloud | favicon.svg | https://www.icloud.com/favicon.svg | 404 | text/html | 0×0 | failed | 105 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | mail-icloud | favicon-32x32.png | https://www.icloud.com/favicon-32x32.png | 404 | text/html | 0×0 | failed | 137 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | mail-icloud | favicon.ico | https://www.icloud.com/favicon.ico | 200 | image/x-icon | 48×48 | loaded | 20 | — | unauthenticated-http-probe | — |
| chromium-extension | maps-apple | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fmaps.apple.com%2F&size=128 | 200 | — | 64×64 | loaded | 8 | — | browser | default-globe-placeholder |
| chromium-extension | maps-apple | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fmaps.apple.com%2F&size=64 | 200 | — | 64×64 | loaded | 4 | — | browser | default-globe-placeholder |
| chromium-extension | maps-apple | apple-touch-icon | https://maps.apple.com/apple-touch-icon.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 201 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| chromium-extension | maps-apple | apple-touch-icon-precomposed | https://maps.apple.com/apple-touch-icon-precomposed.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 76 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| chromium-extension | maps-apple | favicon.svg | https://maps.apple.com/favicon.svg | 404 | text/html; charset=utf-8 | 0×0 | failed | 118 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| chromium-extension | maps-apple | favicon-32x32.png | https://maps.apple.com/favicon-32x32.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 89 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| chromium-extension | maps-apple | favicon.ico | https://maps.apple.com/favicon.ico | 200 | image/x-icon | 64×64 | loaded | 41 | — | unauthenticated-http-probe | — |
| chromium-extension | maps-openstreetmap | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.openstreetmap.org%2F&size=128 | 200 | — | 64×64 | loaded | 12 | — | browser | default-globe-placeholder |
| chromium-extension | maps-openstreetmap | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.openstreetmap.org%2F&size=64 | 200 | — | 64×64 | loaded | 5 | — | browser | default-globe-placeholder |
| chromium-extension | maps-openstreetmap | apple-touch-icon | https://www.openstreetmap.org/apple-touch-icon.png | 429 | text/html; charset=utf-8 | 0×0 | failed | 311 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | maps-openstreetmap | apple-touch-icon-precomposed | https://www.openstreetmap.org/apple-touch-icon-precomposed.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 285 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | maps-openstreetmap | favicon.svg | https://www.openstreetmap.org/favicon.svg | 404 | text/html; charset=utf-8 | 0×0 | failed | 293 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | maps-openstreetmap | favicon-32x32.png | https://www.openstreetmap.org/favicon-32x32.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 289 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | maps-openstreetmap | favicon.ico | https://www.openstreetmap.org/favicon.ico | 200 | image/vnd.microsoft.icon | 48×48 | loaded | 304 | — | unauthenticated-http-probe | — |
| chromium-extension | social-x | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fx.com%2F&size=128 | 200 | — | 64×64 | loaded | 6 | — | browser | default-globe-placeholder |
| chromium-extension | social-x | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fx.com%2F&size=64 | 200 | — | 64×64 | loaded | 9 | — | browser | default-globe-placeholder |
| chromium-extension | social-x | apple-touch-icon | https://x.com/apple-touch-icon.png | 200 | image/png | 0×0 | failed | 114 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| chromium-extension | social-x | apple-touch-icon-precomposed | https://x.com/apple-touch-icon-precomposed.png | 404 | text/html;charset=utf-8 | 0×0 | failed | 61 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| chromium-extension | social-x | favicon.svg | https://x.com/favicon.svg | 404 | text/html; charset=UTF-8 | 0×0 | failed | 74 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| chromium-extension | social-x | favicon-32x32.png | https://x.com/favicon-32x32.png | 404 | text/html; charset=UTF-8 | 0×0 | failed | 65 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| chromium-extension | social-x | favicon.ico | https://x.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 63 | — | unauthenticated-http-probe | — |
| chromium-extension | social-facebook | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.facebook.com%2F&size=128 | 200 | — | 64×64 | loaded | 5 | — | browser | default-globe-placeholder |
| chromium-extension | social-facebook | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.facebook.com%2F&size=64 | 200 | — | 64×64 | loaded | 5 | — | browser | default-globe-placeholder |
| chromium-extension | social-facebook | apple-touch-icon | https://www.facebook.com/apple-touch-icon.png | 200 | image/png | 180×180 | loaded | 80 | cross-origin | browser | — |
| chromium-extension | social-facebook | apple-touch-icon-precomposed | https://www.facebook.com/apple-touch-icon-precomposed.png | 200 | image/png | 180×180 | loaded | 45 | cross-origin | browser | — |
| chromium-extension | social-facebook | favicon.svg | https://www.facebook.com/favicon.svg | 302 | text/html; charset="utf-8" | 0×0 | failed | 85 | same-origin | browser | blocked-by-corp-same-origin |
| chromium-extension | social-facebook | favicon-32x32.png | https://www.facebook.com/favicon-32x32.png | 302 | text/html; charset="utf-8" | 0×0 | failed | 121 | same-origin | browser | blocked-by-corp-same-origin |
| chromium-extension | social-facebook | favicon.ico | https://www.facebook.com/favicon.ico | 200 | image/png | 60×60 | loaded | 73 | cross-origin | unauthenticated-http-probe | — |
| chromium-extension | social-instagram | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.instagram.com%2F&size=128 | 200 | — | 64×64 | loaded | 8 | — | browser | default-globe-placeholder |
| chromium-extension | social-instagram | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.instagram.com%2F&size=64 | 200 | — | 64×64 | loaded | 7 | — | browser | default-globe-placeholder |
| chromium-extension | social-instagram | apple-touch-icon | https://www.instagram.com/apple-touch-icon.png | 302 | text/html; charset="utf-8" | 0×0 | failed | 215 | same-origin | browser | blocked-by-corp-same-origin |
| chromium-extension | social-instagram | apple-touch-icon-precomposed | https://www.instagram.com/apple-touch-icon-precomposed.png | 302 | text/html; charset="utf-8" | 0×0 | failed | 180 | same-origin | browser | blocked-by-corp-same-origin |
| chromium-extension | social-instagram | favicon.svg | https://www.instagram.com/favicon.svg | 302 | text/html; charset="utf-8" | 0×0 | failed | 200 | same-origin | browser | blocked-by-corp-same-origin |
| chromium-extension | social-instagram | favicon-32x32.png | https://www.instagram.com/favicon-32x32.png | 302 | text/html; charset="utf-8" | 0×0 | failed | 171 | same-origin | browser | blocked-by-corp-same-origin |
| chromium-extension | social-instagram | favicon.ico | https://www.instagram.com/favicon.ico | 200 | image/png | 0×0 | failed | 157 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| chromium-extension | social-linkedin | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.linkedin.com%2F&size=128 | 200 | — | 64×64 | loaded | 6 | — | browser | default-globe-placeholder |
| chromium-extension | social-linkedin | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.linkedin.com%2F&size=64 | 200 | — | 64×64 | loaded | 8 | — | browser | default-globe-placeholder |
| chromium-extension | social-linkedin | apple-touch-icon | https://www.linkedin.com/apple-touch-icon.png | 404 | — | 0×0 | failed | 167 | — | browser | image-decode-or-policy-error-http-404 |
| chromium-extension | social-linkedin | apple-touch-icon-precomposed | https://www.linkedin.com/apple-touch-icon-precomposed.png | 404 | — | 0×0 | failed | 76 | — | browser | image-decode-or-policy-error-http-404 |
| chromium-extension | social-linkedin | favicon.svg | https://www.linkedin.com/favicon.svg | 404 | text/html | 0×0 | failed | 67 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | social-linkedin | favicon-32x32.png | https://www.linkedin.com/favicon-32x32.png | 404 | text/html | 0×0 | failed | 120 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | social-linkedin | favicon.ico | https://www.linkedin.com/favicon.ico | 200 | image/x-icon | 64×64 | loaded | 83 | — | unauthenticated-http-probe | — |
| chromium-extension | social-weibo | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fweibo.com%2F&size=128 | 200 | — | 64×64 | loaded | 8 | — | browser | default-globe-placeholder |
| chromium-extension | social-weibo | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fweibo.com%2F&size=64 | 200 | — | 64×64 | loaded | 7 | — | browser | default-globe-placeholder |
| chromium-extension | social-weibo | apple-touch-icon | https://weibo.com/apple-touch-icon.png | 302 | text/html; charset=utf-8 | 0×0 | failed | 2376 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | social-weibo | apple-touch-icon-precomposed | https://weibo.com/apple-touch-icon-precomposed.png | 302 | text/html; charset=utf-8 | 0×0 | failed | 609 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | social-weibo | favicon.svg | https://weibo.com/favicon.svg | 302 | text/html; charset=utf-8 | 0×0 | failed | 570 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | social-weibo | favicon-32x32.png | https://weibo.com/favicon-32x32.png | 302 | text/html; charset=utf-8 | 0×0 | failed | 564 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | social-weibo | favicon.ico | https://weibo.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 329 | — | unauthenticated-http-probe | — |
| chromium-extension | video-bilibili | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.bilibili.com%2F&size=128 | 200 | — | 64×64 | loaded | 4 | — | browser | default-globe-placeholder |
| chromium-extension | video-bilibili | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.bilibili.com%2F&size=64 | 200 | — | 64×64 | loaded | 3 | — | browser | default-globe-placeholder |
| chromium-extension | video-bilibili | apple-touch-icon | https://www.bilibili.com/apple-touch-icon.png | 404 | text/html | 0×0 | failed | 644 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | video-bilibili | apple-touch-icon-precomposed | https://www.bilibili.com/apple-touch-icon-precomposed.png | 404 | text/html | 0×0 | failed | 244 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | video-bilibili | favicon.svg | https://www.bilibili.com/favicon.svg | 404 | text/html | 0×0 | failed | 241 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | video-bilibili | favicon-32x32.png | https://www.bilibili.com/favicon-32x32.png | 404 | text/html | 0×0 | failed | 247 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | video-bilibili | favicon.ico | https://www.bilibili.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 77 | — | unauthenticated-http-probe | — |
| chromium-extension | video-netflix | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.netflix.com%2F&size=128 | 200 | — | 64×64 | loaded | 5 | — | browser | default-globe-placeholder |
| chromium-extension | video-netflix | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.netflix.com%2F&size=64 | 200 | — | 64×64 | loaded | 5 | — | browser | default-globe-placeholder |
| chromium-extension | video-netflix | apple-touch-icon | https://www.netflix.com/apple-touch-icon.png | 302 | text/html; charset=utf-8 | 0×0 | failed | 186 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | video-netflix | apple-touch-icon-precomposed | https://www.netflix.com/apple-touch-icon-precomposed.png | 302 | text/html; charset=utf-8 | 0×0 | failed | 88 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | video-netflix | favicon.svg | https://www.netflix.com/favicon.svg | 302 | text/html; charset=utf-8 | 0×0 | failed | 105 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | video-netflix | favicon-32x32.png | https://www.netflix.com/favicon-32x32.png | 302 | text/html; charset=utf-8 | 0×0 | failed | 97 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | video-netflix | favicon.ico | https://www.netflix.com/favicon.ico | 200 | image/x-icon | 64×64 | loaded | 86 | — | unauthenticated-http-probe | — |
| chromium-extension | video-twitch | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.twitch.tv%2F&size=128 | 200 | — | 64×64 | loaded | 4 | — | browser | default-globe-placeholder |
| chromium-extension | video-twitch | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.twitch.tv%2F&size=64 | 200 | — | 64×64 | loaded | 5 | — | browser | default-globe-placeholder |
| chromium-extension | video-twitch | apple-touch-icon | https://www.twitch.tv/apple-touch-icon.png | 200 | image/png | 180×180 | loaded | 101 | — | browser | — |
| chromium-extension | video-twitch | apple-touch-icon-precomposed | https://www.twitch.tv/apple-touch-icon-precomposed.png | 200 | text/html | 0×0 | failed | 21 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | video-twitch | favicon.svg | https://www.twitch.tv/favicon.svg | 200 | text/html | 0×0 | failed | 19 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | video-twitch | favicon-32x32.png | https://www.twitch.tv/favicon-32x32.png | 200 | text/html | 0×0 | failed | 21 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | video-twitch | favicon.ico | https://www.twitch.tv/favicon.ico | 200 | application/octet-stream | 32×32 | loaded | 24 | — | unauthenticated-http-probe | content-type-application/octet-stream |
| chromium-extension | ecommerce-ebay | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.ebay.com%2F&size=128 | 200 | — | 64×64 | loaded | 6 | — | browser | default-globe-placeholder |
| chromium-extension | ecommerce-ebay | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.ebay.com%2F&size=64 | 200 | — | 64×64 | loaded | 12 | — | browser | default-globe-placeholder |
| chromium-extension | ecommerce-ebay | apple-touch-icon | https://www.ebay.com/apple-touch-icon.png | 200 | image/png | 60×60 | loaded | 536 | — | browser | — |
| chromium-extension | ecommerce-ebay | apple-touch-icon-precomposed | https://www.ebay.com/apple-touch-icon-precomposed.png | 302 | text/html;charset=UTF-8 | 0×0 | failed | 186 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | ecommerce-ebay | favicon.svg | https://www.ebay.com/favicon.svg | 302 | text/html;charset=UTF-8 | 0×0 | failed | 688 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | ecommerce-ebay | favicon-32x32.png | https://www.ebay.com/favicon-32x32.png | 302 | text/html;charset=UTF-8 | 0×0 | failed | 588 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | ecommerce-ebay | favicon.ico | https://www.ebay.com/favicon.ico | 200 | image/x-icon | 16×16 | loaded | 27 | — | unauthenticated-http-probe | — |
| chromium-extension | ecommerce-taobao | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.taobao.com%2F&size=128 | 200 | — | 64×64 | loaded | 9 | — | browser | default-globe-placeholder |
| chromium-extension | ecommerce-taobao | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.taobao.com%2F&size=64 | 200 | — | 64×64 | loaded | 9 | — | browser | default-globe-placeholder |
| chromium-extension | ecommerce-taobao | apple-touch-icon | https://www.taobao.com/apple-touch-icon.png | 302 | text/html | 0×0 | failed | 2272 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | ecommerce-taobao | apple-touch-icon-precomposed | https://www.taobao.com/apple-touch-icon-precomposed.png | 302 | text/html | 0×0 | failed | 1536 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | ecommerce-taobao | favicon.svg | https://www.taobao.com/favicon.svg | 302 | text/html | 0×0 | failed | 1156 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | ecommerce-taobao | favicon-32x32.png | https://www.taobao.com/favicon-32x32.png | 302 | text/html | 0×0 | failed | 1139 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | ecommerce-taobao | favicon.ico | https://www.taobao.com/favicon.ico | 200 | image/x-icon | 64×64 | loaded | 1105 | — | unauthenticated-http-probe | — |
| chromium-extension | ecommerce-jd | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.jd.com%2F&size=128 | 200 | — | 64×64 | loaded | 9 | — | browser | default-globe-placeholder |
| chromium-extension | ecommerce-jd | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.jd.com%2F&size=64 | 200 | — | 64×64 | loaded | 8 | — | browser | default-globe-placeholder |
| chromium-extension | ecommerce-jd | apple-touch-icon | https://www.jd.com/apple-touch-icon.png | 301 | text/html | 0×0 | failed | 2093 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | ecommerce-jd | apple-touch-icon-precomposed | https://www.jd.com/apple-touch-icon-precomposed.png | 301 | text/html | 0×0 | failed | 380 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | ecommerce-jd | favicon.svg | https://www.jd.com/favicon.svg | 301 | text/html | 0×0 | failed | 506 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | ecommerce-jd | favicon-32x32.png | https://www.jd.com/favicon-32x32.png | 301 | text/html | 0×0 | failed | 334 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | ecommerce-jd | favicon.ico | https://www.jd.com/favicon.ico | 200 | image/x-icon | 48×48 | loaded | 37 | — | unauthenticated-http-probe | — |
| chromium-extension | ai-gemini | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fgemini.google.com%2F&size=128 | 200 | — | 64×64 | loaded | 6 | — | browser | default-globe-placeholder |
| chromium-extension | ai-gemini | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fgemini.google.com%2F&size=64 | 200 | — | 64×64 | loaded | 11 | — | browser | default-globe-placeholder |
| chromium-extension | ai-gemini | apple-touch-icon | https://gemini.google.com/apple-touch-icon.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 123 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | ai-gemini | apple-touch-icon-precomposed | https://gemini.google.com/apple-touch-icon-precomposed.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 129 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | ai-gemini | favicon.svg | https://gemini.google.com/favicon.svg | 404 | text/html; charset=utf-8 | 0×0 | failed | 246 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | ai-gemini | favicon-32x32.png | https://gemini.google.com/favicon-32x32.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 58 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | ai-gemini | favicon.ico | https://gemini.google.com/favicon.ico | 404 | text/html; charset=utf-8 | 0×0 | failed | 81 | — | unauthenticated-http-probe | image-decode-or-policy-error-http-404 |
| chromium-extension | ai-perplexity | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.perplexity.ai%2F&size=128 | 200 | — | 64×64 | loaded | 6 | — | browser | default-globe-placeholder |
| chromium-extension | ai-perplexity | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.perplexity.ai%2F&size=64 | 200 | — | 64×64 | loaded | 10 | — | browser | default-globe-placeholder |
| chromium-extension | ai-perplexity | apple-touch-icon | https://www.perplexity.ai/apple-touch-icon.png | 200 | image/png | 180×180 | loaded | 119 | cross-origin | browser | — |
| chromium-extension | ai-perplexity | apple-touch-icon-precomposed | https://www.perplexity.ai/apple-touch-icon-precomposed.png | 404 | text/html; charset=UTF-8 | 0×0 | failed | 77 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| chromium-extension | ai-perplexity | favicon.svg | https://www.perplexity.ai/favicon.svg | 200 | image/svg+xml | 360×360 | loaded | 35 | cross-origin | browser | — |
| chromium-extension | ai-perplexity | favicon-32x32.png | https://www.perplexity.ai/favicon-32x32.png | 404 | text/html; charset=UTF-8 | 0×0 | failed | 83 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| chromium-extension | ai-perplexity | favicon.ico | https://www.perplexity.ai/favicon.ico | 200 | image/x-icon | 48×48 | loaded | 21 | cross-origin | unauthenticated-http-probe | — |
| chromium-extension | ai-copilot | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fcopilot.microsoft.com%2F&size=128 | 200 | — | 64×64 | loaded | 13 | — | browser | default-globe-placeholder |
| chromium-extension | ai-copilot | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fcopilot.microsoft.com%2F&size=64 | 200 | — | 64×64 | loaded | 11 | — | browser | default-globe-placeholder |
| chromium-extension | ai-copilot | apple-touch-icon | https://copilot.microsoft.com/apple-touch-icon.png | 301 | text/html; charset=UTF-8 | 0×0 | failed | 226 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | ai-copilot | apple-touch-icon-precomposed | https://copilot.microsoft.com/apple-touch-icon-precomposed.png | 301 | text/html; charset=UTF-8 | 0×0 | failed | 193 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | ai-copilot | favicon.svg | https://copilot.microsoft.com/favicon.svg | 301 | text/html; charset=UTF-8 | 0×0 | failed | 278 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | ai-copilot | favicon-32x32.png | https://copilot.microsoft.com/favicon-32x32.png | 301 | text/html; charset=UTF-8 | 0×0 | failed | 236 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | ai-copilot | favicon.ico | https://copilot.microsoft.com/favicon.ico | 200 | image/vnd.microsoft.icon | 48×48 | loaded | 38 | — | unauthenticated-http-probe | — |
| chromium-extension | ai-deepseek | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.deepseek.com%2F&size=128 | 200 | — | 64×64 | loaded | 18 | — | browser | default-globe-placeholder |
| chromium-extension | ai-deepseek | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.deepseek.com%2F&size=64 | 200 | — | 64×64 | loaded | 8 | — | browser | default-globe-placeholder |
| chromium-extension | ai-deepseek | apple-touch-icon | https://www.deepseek.com/apple-touch-icon.png | 404 | text/html | 0×0 | failed | 466 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | ai-deepseek | apple-touch-icon-precomposed | https://www.deepseek.com/apple-touch-icon-precomposed.png | 404 | text/html | 0×0 | failed | 143 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | ai-deepseek | favicon.svg | https://www.deepseek.com/favicon.svg | 404 | text/html | 0×0 | failed | 126 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | ai-deepseek | favicon-32x32.png | https://www.deepseek.com/favicon-32x32.png | 404 | text/html | 0×0 | failed | 92 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | ai-deepseek | favicon.ico | https://www.deepseek.com/favicon.ico | 200 | image/vnd.microsoft.icon | 225×225 | loaded | 59 | — | unauthenticated-http-probe | — |
| chromium-extension | ai-kimi | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.kimi.com%2F&size=128 | 200 | — | 64×64 | loaded | 7 | — | browser | default-globe-placeholder |
| chromium-extension | ai-kimi | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.kimi.com%2F&size=64 | 200 | — | 64×64 | loaded | 7 | — | browser | default-globe-placeholder |
| chromium-extension | ai-kimi | apple-touch-icon | https://www.kimi.com/apple-touch-icon.png | 302 | text/plain; charset=utf-8 | 0×0 | failed | 884 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | ai-kimi | apple-touch-icon-precomposed | https://www.kimi.com/apple-touch-icon-precomposed.png | 302 | text/plain; charset=utf-8 | 0×0 | failed | 573 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | ai-kimi | favicon.svg | https://www.kimi.com/favicon.svg | 302 | text/plain; charset=utf-8 | 0×0 | failed | 1108 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | ai-kimi | favicon-32x32.png | https://www.kimi.com/favicon-32x32.png | 302 | text/plain; charset=utf-8 | 0×0 | failed | 1089 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | ai-kimi | favicon.ico | https://www.kimi.com/favicon.ico | 200 | — | 48×48 | loaded | 58 | — | unauthenticated-http-probe | — |
| chromium-extension | dev-github | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fgithub.com%2F&size=128 | 200 | — | 64×64 | loaded | 8 | — | browser | default-globe-placeholder |
| chromium-extension | dev-github | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fgithub.com%2F&size=64 | 200 | — | 64×64 | loaded | 5 | — | browser | default-globe-placeholder |
| chromium-extension | dev-github | apple-touch-icon | https://github.com/apple-touch-icon.png | 200 | image/png | 120×120 | loaded | 155 | — | browser | — |
| chromium-extension | dev-github | apple-touch-icon-precomposed | https://github.com/apple-touch-icon-precomposed.png | 404 | text/plain; charset=utf-8 | 0×0 | failed | 98 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | dev-github | favicon.svg | https://github.com/favicon.svg | 406 | image/svg+xml | 0×0 | failed | 115 | — | browser | image-decode-or-policy-error-http-406 |
| chromium-extension | dev-github | favicon-32x32.png | https://github.com/favicon-32x32.png | 404 | text/plain; charset=utf-8 | 0×0 | failed | 85 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | dev-github | favicon.ico | https://github.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 36 | — | unauthenticated-http-probe | — |
| chromium-extension | dev-gitlab | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fgitlab.com%2F&size=128 | 200 | — | 64×64 | loaded | 6 | — | browser | default-globe-placeholder |
| chromium-extension | dev-gitlab | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fgitlab.com%2F&size=64 | 200 | — | 64×64 | loaded | 5 | — | browser | default-globe-placeholder |
| chromium-extension | dev-gitlab | apple-touch-icon | https://gitlab.com/apple-touch-icon.png | 200 | image/png | 180×180 | loaded | 97 | — | browser | — |
| chromium-extension | dev-gitlab | apple-touch-icon-precomposed | https://gitlab.com/apple-touch-icon-precomposed.png | 302 | text/html; charset=utf-8 | 0×0 | failed | 264 | same-origin | browser | bot-challenge |
| chromium-extension | dev-gitlab | favicon.svg | https://gitlab.com/favicon.svg | 302 | text/html; charset=utf-8 | 0×0 | failed | 223 | same-origin | browser | bot-challenge |
| chromium-extension | dev-gitlab | favicon-32x32.png | https://gitlab.com/favicon-32x32.png | 302 | text/html; charset=utf-8 | 0×0 | failed | 236 | same-origin | browser | bot-challenge |
| chromium-extension | dev-gitlab | favicon.ico | https://gitlab.com/favicon.ico | 200 | image/png | 32×32 | loaded | 160 | — | unauthenticated-http-probe | — |
| chromium-extension | dev-stackoverflow | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fstackoverflow.com%2F&size=128 | 200 | — | 64×64 | loaded | 6 | — | browser | default-globe-placeholder |
| chromium-extension | dev-stackoverflow | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fstackoverflow.com%2F&size=64 | 200 | — | 64×64 | loaded | 2 | — | browser | default-globe-placeholder |
| chromium-extension | dev-stackoverflow | apple-touch-icon | https://stackoverflow.com/apple-touch-icon.png | 200 | image/png | 180×180 | loaded | 117 | — | browser | — |
| chromium-extension | dev-stackoverflow | apple-touch-icon-precomposed | https://stackoverflow.com/apple-touch-icon-precomposed.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 68 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | dev-stackoverflow | favicon.svg | https://stackoverflow.com/favicon.svg | 429 | text/html; charset=UTF-8 | 0×0 | failed | 78 | same-origin | unauthenticated-http-probe | bot-challenge |
| chromium-extension | dev-stackoverflow | favicon-32x32.png | https://stackoverflow.com/favicon-32x32.png | 429 | text/html; charset=UTF-8 | 0×0 | failed | 21 | same-origin | unauthenticated-http-probe | bot-challenge |
| chromium-extension | dev-stackoverflow | favicon.ico | https://stackoverflow.com/favicon.ico | 429 | text/html; charset=UTF-8 | 0×0 | failed | 12 | same-origin | unauthenticated-http-probe | bot-challenge |
| chromium-extension | dev-mdn | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fdeveloper.mozilla.org%2F&size=128 | 200 | — | 64×64 | loaded | 6 | — | browser | default-globe-placeholder |
| chromium-extension | dev-mdn | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fdeveloper.mozilla.org%2F&size=64 | 200 | — | 64×64 | loaded | 4 | — | browser | default-globe-placeholder |
| chromium-extension | dev-mdn | apple-touch-icon | https://developer.mozilla.org/apple-touch-icon.png | 200 | image/png | 192×192 | loaded | 43 | — | browser | — |
| chromium-extension | dev-mdn | apple-touch-icon-precomposed | https://developer.mozilla.org/apple-touch-icon-precomposed.png | 404 | text/html | 0×0 | failed | 182 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | dev-mdn | favicon.svg | https://developer.mozilla.org/favicon.svg | 200 | image/svg+xml | 56×56 | loaded | 25 | — | browser | — |
| chromium-extension | dev-mdn | favicon-32x32.png | https://developer.mozilla.org/favicon-32x32.png | 200 | image/png | 32×32 | loaded | 12 | — | browser | — |
| chromium-extension | dev-mdn | favicon.ico | https://developer.mozilla.org/favicon.ico | 200 | image/x-icon | 48×48 | loaded | 14 | — | unauthenticated-http-probe | — |
| chromium-extension | dev-npm | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.npmjs.com%2F&size=128 | 200 | — | 64×64 | loaded | 8 | — | browser | default-globe-placeholder |
| chromium-extension | dev-npm | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.npmjs.com%2F&size=64 | 200 | — | 64×64 | loaded | 5 | — | browser | default-globe-placeholder |
| chromium-extension | dev-npm | apple-touch-icon | https://www.npmjs.com/apple-touch-icon.png | 403 | text/html; charset=UTF-8 | 0×0 | failed | 56 | same-origin | unauthenticated-http-probe | bot-challenge |
| chromium-extension | dev-npm | apple-touch-icon-precomposed | https://www.npmjs.com/apple-touch-icon-precomposed.png | 403 | text/html; charset=UTF-8 | 0×0 | failed | 19 | same-origin | unauthenticated-http-probe | bot-challenge |
| chromium-extension | dev-npm | favicon.svg | https://www.npmjs.com/favicon.svg | 403 | text/html; charset=UTF-8 | 0×0 | failed | 16 | same-origin | unauthenticated-http-probe | bot-challenge |
| chromium-extension | dev-npm | favicon-32x32.png | https://www.npmjs.com/favicon-32x32.png | 403 | text/html; charset=UTF-8 | 0×0 | failed | 18 | same-origin | unauthenticated-http-probe | bot-challenge |
| chromium-extension | dev-npm | favicon.ico | https://www.npmjs.com/favicon.ico | 403 | text/html; charset=UTF-8 | 0×0 | failed | 15 | same-origin | unauthenticated-http-probe | bot-challenge |
| chromium-extension | dev-vercel | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fvercel.com%2F&size=128 | 200 | — | 64×64 | loaded | 8 | — | browser | default-globe-placeholder |
| chromium-extension | dev-vercel | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fvercel.com%2F&size=64 | 200 | — | 64×64 | loaded | 8 | — | browser | default-globe-placeholder |
| chromium-extension | dev-vercel | apple-touch-icon | https://vercel.com/apple-touch-icon.png | 200 | image/png | 180×180 | loaded | 301 | — | browser | — |
| chromium-extension | dev-vercel | apple-touch-icon-precomposed | https://vercel.com/apple-touch-icon-precomposed.png | 200 | image/png | 180×180 | loaded | 47 | — | browser | — |
| chromium-extension | dev-vercel | favicon.svg | https://vercel.com/favicon.svg | 404 | text/markdown; charset=utf-8 | 0×0 | failed | 42 | — | browser | image-decode-or-policy-error-http-404 |
| chromium-extension | dev-vercel | favicon-32x32.png | https://vercel.com/favicon-32x32.png | 404 | text/markdown; charset=utf-8 | 0×0 | failed | 71 | — | browser | image-decode-or-policy-error-http-404 |
| chromium-extension | dev-vercel | favicon.ico | https://vercel.com/favicon.ico | 200 | image/vnd.microsoft.icon | 48×48 | loaded | 55 | — | unauthenticated-http-probe | — |
| chromium-extension | news-nytimes | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.nytimes.com%2F&size=128 | 200 | — | 64×64 | loaded | 7 | — | browser | default-globe-placeholder |
| chromium-extension | news-nytimes | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.nytimes.com%2F&size=64 | 200 | — | 64×64 | loaded | 7 | — | browser | default-globe-placeholder |
| chromium-extension | news-nytimes | apple-touch-icon | https://www.nytimes.com/apple-touch-icon.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 647 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | news-nytimes | apple-touch-icon-precomposed | https://www.nytimes.com/apple-touch-icon-precomposed.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 319 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | news-nytimes | favicon.svg | https://www.nytimes.com/favicon.svg | 404 | text/html; charset=UTF-8 | 0×0 | failed | 207 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | news-nytimes | favicon-32x32.png | https://www.nytimes.com/favicon-32x32.png | 404 | text/html; charset=UTF-8 | 0×0 | failed | 163 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | news-nytimes | favicon.ico | https://www.nytimes.com/favicon.ico | 200 | image/x-icon | 48×48 | loaded | 22 | — | unauthenticated-http-probe | — |
| chromium-extension | news-bbc | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.bbc.com%2F&size=128 | 200 | — | 64×64 | loaded | 7 | — | browser | default-globe-placeholder |
| chromium-extension | news-bbc | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.bbc.com%2F&size=64 | 200 | — | 64×64 | loaded | 7 | — | browser | default-globe-placeholder |
| chromium-extension | news-bbc | apple-touch-icon | https://www.bbc.com/apple-touch-icon.png | 200 | image/png | 57×57 | loaded | 168 | — | browser | — |
| chromium-extension | news-bbc | apple-touch-icon-precomposed | https://www.bbc.com/apple-touch-icon-precomposed.png | 200 | image/png | 57×57 | loaded | 30 | — | browser | — |
| chromium-extension | news-bbc | favicon.svg | https://www.bbc.com/favicon.svg | 404 | text/html; charset=utf-8 | 0×0 | failed | 15 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | news-bbc | favicon-32x32.png | https://www.bbc.com/favicon-32x32.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 24 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | news-bbc | favicon.ico | https://www.bbc.com/favicon.ico | 200 | image/vnd.microsoft.icon | 48×48 | loaded | 32 | — | unauthenticated-http-probe | — |
| chromium-extension | news-cnn | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.cnn.com%2F&size=128 | 200 | — | 64×64 | loaded | 6 | — | browser | default-globe-placeholder |
| chromium-extension | news-cnn | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.cnn.com%2F&size=64 | 200 | — | 64×64 | loaded | 6 | — | browser | default-globe-placeholder |
| chromium-extension | news-cnn | apple-touch-icon | https://www.cnn.com/apple-touch-icon.png | 404 | text/plain; charset=utf-8 | 0×0 | failed | 62 | — | browser | image-decode-or-policy-error-http-404 |
| chromium-extension | news-cnn | apple-touch-icon-precomposed | https://www.cnn.com/apple-touch-icon-precomposed.png | 404 | text/plain; charset=utf-8 | 0×0 | failed | 22 | — | browser | image-decode-or-policy-error-http-404 |
| chromium-extension | news-cnn | favicon.svg | https://www.cnn.com/favicon.svg | 200 | text/html | 0×0 | failed | 18 | — | browser | image-decode-or-policy-error-http-200 |
| chromium-extension | news-cnn | favicon-32x32.png | https://www.cnn.com/favicon-32x32.png | 200 | text/html | 0×0 | failed | 26 | — | browser | image-decode-or-policy-error-http-200 |
| chromium-extension | news-cnn | favicon.ico | https://www.cnn.com/favicon.ico | 200 | image/x-icon | 0×0 | failed | 15 | — | unauthenticated-http-probe | image-decode-or-policy-error-http-200 |
| chromium-extension | news-guardian | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.theguardian.com%2F&size=128 | 200 | — | 64×64 | loaded | 6 | — | browser | default-globe-placeholder |
| chromium-extension | news-guardian | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.theguardian.com%2F&size=64 | 200 | — | 64×64 | loaded | 6 | — | browser | default-globe-placeholder |
| chromium-extension | news-guardian | apple-touch-icon | https://www.theguardian.com/apple-touch-icon.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 58 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | news-guardian | apple-touch-icon-precomposed | https://www.theguardian.com/apple-touch-icon-precomposed.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 30 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | news-guardian | favicon.svg | https://www.theguardian.com/favicon.svg | 404 | text/html; charset=UTF-8 | 0×0 | failed | 141 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | news-guardian | favicon-32x32.png | https://www.theguardian.com/favicon-32x32.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 13 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | news-guardian | favicon.ico | https://www.theguardian.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 13 | — | unauthenticated-http-probe | — |
| chromium-extension | office-notion | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.notion.so%2F&size=128 | 200 | — | 64×64 | loaded | 7 | — | browser | default-globe-placeholder |
| chromium-extension | office-notion | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.notion.so%2F&size=64 | 200 | — | 64×64 | loaded | 6 | — | browser | default-globe-placeholder |
| chromium-extension | office-notion | apple-touch-icon | https://www.notion.so/apple-touch-icon.png | 403 | text/html; charset=UTF-8 | 0×0 | failed | 64 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | office-notion | apple-touch-icon-precomposed | https://www.notion.so/apple-touch-icon-precomposed.png | 403 | text/html; charset=UTF-8 | 0×0 | failed | 34 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | office-notion | favicon.svg | https://www.notion.so/favicon.svg | 403 | text/html; charset=UTF-8 | 0×0 | failed | 166 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | office-notion | favicon-32x32.png | https://www.notion.so/favicon-32x32.png | 403 | text/html; charset=UTF-8 | 0×0 | failed | 275 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | office-notion | favicon.ico | https://www.notion.so/favicon.ico | 403 | text/html; charset=UTF-8 | 0×0 | failed | 29 | — | unauthenticated-http-probe | image-decode-or-policy-error-http-403 |
| chromium-extension | office-google-docs | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fdocs.google.com%2F&size=128 | 200 | — | 64×64 | loaded | 5 | — | browser | default-globe-placeholder |
| chromium-extension | office-google-docs | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fdocs.google.com%2F&size=64 | 200 | — | 64×64 | loaded | 5 | — | browser | default-globe-placeholder |
| chromium-extension | office-google-docs | apple-touch-icon | https://docs.google.com/apple-touch-icon.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 81 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | office-google-docs | apple-touch-icon-precomposed | https://docs.google.com/apple-touch-icon-precomposed.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 55 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | office-google-docs | favicon.svg | https://docs.google.com/favicon.svg | 404 | text/html; charset=utf-8 | 0×0 | failed | 45 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | office-google-docs | favicon-32x32.png | https://docs.google.com/favicon-32x32.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 48 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | office-google-docs | favicon.ico | https://docs.google.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 92 | cross-origin | unauthenticated-http-probe | — |
| chromium-extension | office-microsoft | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.office.com%2F&size=128 | 200 | — | 64×64 | loaded | 7 | — | browser | default-globe-placeholder |
| chromium-extension | office-microsoft | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.office.com%2F&size=64 | 200 | — | 64×64 | loaded | 8 | — | browser | default-globe-placeholder |
| chromium-extension | office-microsoft | apple-touch-icon | https://www.office.com/apple-touch-icon.png | 302 | text/html; charset=utf-8 | 0×0 | failed | 409 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | office-microsoft | apple-touch-icon-precomposed | https://www.office.com/apple-touch-icon-precomposed.png | 302 | text/html; charset=utf-8 | 0×0 | failed | 324 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | office-microsoft | favicon.svg | https://www.office.com/favicon.svg | 302 | text/html; charset=utf-8 | 0×0 | failed | 330 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | office-microsoft | favicon-32x32.png | https://www.office.com/favicon-32x32.png | 302 | text/html; charset=utf-8 | 0×0 | failed | 311 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | office-microsoft | favicon.ico | https://www.office.com/favicon.ico | 200 | text/html; charset=utf-8 | 0×0 | failed | 337 | — | unauthenticated-http-probe | image-decode-or-policy-error-http-200 |
| chromium-extension | cloud-google-drive | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fdrive.google.com%2F&size=128 | 200 | — | 64×64 | loaded | 6 | — | browser | default-globe-placeholder |
| chromium-extension | cloud-google-drive | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fdrive.google.com%2F&size=64 | 200 | — | 64×64 | loaded | 6 | — | browser | default-globe-placeholder |
| chromium-extension | cloud-google-drive | apple-touch-icon | https://drive.google.com/apple-touch-icon.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 109 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | cloud-google-drive | apple-touch-icon-precomposed | https://drive.google.com/apple-touch-icon-precomposed.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 102 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | cloud-google-drive | favicon.svg | https://drive.google.com/favicon.svg | 404 | text/html; charset=utf-8 | 0×0 | failed | 44 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | cloud-google-drive | favicon-32x32.png | https://drive.google.com/favicon-32x32.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 53 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | cloud-google-drive | favicon.ico | https://drive.google.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 38 | cross-origin | unauthenticated-http-probe | — |
| chromium-extension | cloud-dropbox | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.dropbox.com%2F&size=128 | 200 | — | 64×64 | loaded | 5 | — | browser | default-globe-placeholder |
| chromium-extension | cloud-dropbox | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.dropbox.com%2F&size=64 | 200 | — | 64×64 | loaded | 5 | — | browser | default-globe-placeholder |
| chromium-extension | cloud-dropbox | apple-touch-icon | https://www.dropbox.com/apple-touch-icon.png | 404 | text/html | 0×0 | failed | 82 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | cloud-dropbox | apple-touch-icon-precomposed | https://www.dropbox.com/apple-touch-icon-precomposed.png | 404 | text/html | 0×0 | failed | 30 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | cloud-dropbox | favicon.svg | https://www.dropbox.com/favicon.svg | 404 | text/html | 0×0 | failed | 26 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | cloud-dropbox | favicon-32x32.png | https://www.dropbox.com/favicon-32x32.png | 404 | text/html | 0×0 | failed | 25 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | cloud-dropbox | favicon.ico | https://www.dropbox.com/favicon.ico | 404 | text/html | 0×0 | failed | 22 | — | unauthenticated-http-probe | image-decode-or-policy-error-http-404 |
| chromium-extension | cloud-onedrive | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fonedrive.live.com%2F&size=128 | 200 | — | 64×64 | loaded | 5 | — | browser | default-globe-placeholder |
| chromium-extension | cloud-onedrive | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fonedrive.live.com%2F&size=64 | 200 | — | 64×64 | loaded | 4 | — | browser | default-globe-placeholder |
| chromium-extension | cloud-onedrive | apple-touch-icon | https://onedrive.live.com/apple-touch-icon.png | 403 | — | 0×0 | failed | 469 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | cloud-onedrive | apple-touch-icon-precomposed | https://onedrive.live.com/apple-touch-icon-precomposed.png | 403 | — | 0×0 | failed | 40 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | cloud-onedrive | favicon.svg | https://onedrive.live.com/favicon.svg | 403 | — | 0×0 | failed | 47 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | cloud-onedrive | favicon-32x32.png | https://onedrive.live.com/favicon-32x32.png | 403 | — | 0×0 | failed | 36 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | cloud-onedrive | favicon.ico | https://onedrive.live.com/favicon.ico | 403 | — | 32×32 | loaded | 29 | — | unauthenticated-http-probe | — |
| chromium-extension | music-spotify | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fopen.spotify.com%2F&size=128 | 200 | — | 64×64 | loaded | 52 | — | browser | default-globe-placeholder |
| chromium-extension | music-spotify | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fopen.spotify.com%2F&size=64 | 200 | — | 64×64 | loaded | 10 | — | browser | default-globe-placeholder |
| chromium-extension | music-spotify | apple-touch-icon | https://open.spotify.com/apple-touch-icon.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 125 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | music-spotify | apple-touch-icon-precomposed | https://open.spotify.com/apple-touch-icon-precomposed.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 71 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | music-spotify | favicon.svg | https://open.spotify.com/favicon.svg | 404 | text/html; charset=utf-8 | 0×0 | failed | 73 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | music-spotify | favicon-32x32.png | https://open.spotify.com/favicon-32x32.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 97 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | music-spotify | favicon.ico | https://open.spotify.com/favicon.ico | 200 | image/vnd.microsoft.icon | 48×48 | loaded | 109 | — | unauthenticated-http-probe | — |
| chromium-extension | music-soundcloud | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fsoundcloud.com%2F&size=128 | 200 | — | 64×64 | loaded | 3 | — | browser | default-globe-placeholder |
| chromium-extension | music-soundcloud | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fsoundcloud.com%2F&size=64 | 200 | — | 64×64 | loaded | 4 | — | browser | default-globe-placeholder |
| chromium-extension | music-soundcloud | apple-touch-icon | https://soundcloud.com/apple-touch-icon.png | 404 | — | 0×0 | failed | 239 | — | browser | image-decode-or-policy-error-http-404 |
| chromium-extension | music-soundcloud | apple-touch-icon-precomposed | https://soundcloud.com/apple-touch-icon-precomposed.png | 404 | — | 0×0 | failed | 132 | — | browser | image-decode-or-policy-error-http-404 |
| chromium-extension | music-soundcloud | favicon.svg | https://soundcloud.com/favicon.svg | 404 | — | 0×0 | failed | 137 | — | browser | image-decode-or-policy-error-http-404 |
| chromium-extension | music-soundcloud | favicon-32x32.png | https://soundcloud.com/favicon-32x32.png | 404 | — | 0×0 | failed | 138 | — | browser | image-decode-or-policy-error-http-404 |
| chromium-extension | music-soundcloud | favicon.ico | https://soundcloud.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 131 | — | unauthenticated-http-probe | — |
| chromium-extension | music-bandcamp | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fbandcamp.com%2F&size=128 | 200 | — | 64×64 | loaded | 5 | — | browser | default-globe-placeholder |
| chromium-extension | music-bandcamp | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fbandcamp.com%2F&size=64 | 200 | — | 64×64 | loaded | 3 | — | browser | default-globe-placeholder |
| chromium-extension | music-bandcamp | apple-touch-icon | https://bandcamp.com/apple-touch-icon.png | 404 | text/html; charset=UTF-8 | 0×0 | failed | 167 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | music-bandcamp | apple-touch-icon-precomposed | https://bandcamp.com/apple-touch-icon-precomposed.png | 404 | text/html; charset=UTF-8 | 0×0 | failed | 156 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | music-bandcamp | favicon.svg | https://bandcamp.com/favicon.svg | 404 | text/html; charset=UTF-8 | 0×0 | failed | 221 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | music-bandcamp | favicon-32x32.png | https://bandcamp.com/favicon-32x32.png | 404 | text/html; charset=UTF-8 | 0×0 | failed | 163 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | music-bandcamp | favicon.ico | https://bandcamp.com/favicon.ico | 404 | — | 0×0 | failed | 82 | — | unauthenticated-http-probe | image-decode-or-policy-error-http-404 |
| chromium-extension | education-coursera | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.coursera.org%2F&size=128 | 200 | — | 64×64 | loaded | 5 | — | browser | default-globe-placeholder |
| chromium-extension | education-coursera | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.coursera.org%2F&size=64 | 200 | — | 64×64 | loaded | 7 | — | browser | default-globe-placeholder |
| chromium-extension | education-coursera | apple-touch-icon | https://www.coursera.org/apple-touch-icon.png | 404 | text/html | 0×0 | failed | 533 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | education-coursera | apple-touch-icon-precomposed | https://www.coursera.org/apple-touch-icon-precomposed.png | 404 | text/html | 0×0 | failed | 223 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | education-coursera | favicon.svg | https://www.coursera.org/favicon.svg | 404 | text/html | 0×0 | failed | 226 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | education-coursera | favicon-32x32.png | https://www.coursera.org/favicon-32x32.png | 404 | text/html | 0×0 | failed | 230 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | education-coursera | favicon.ico | https://www.coursera.org/favicon.ico | 200 | image/x-icon | 48×48 | loaded | 242 | — | unauthenticated-http-probe | — |
| chromium-extension | education-khan | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.khanacademy.org%2F&size=128 | 200 | — | 64×64 | loaded | 5 | — | browser | default-globe-placeholder |
| chromium-extension | education-khan | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.khanacademy.org%2F&size=64 | 200 | — | 64×64 | loaded | 4 | — | browser | default-globe-placeholder |
| chromium-extension | education-khan | apple-touch-icon | https://www.khanacademy.org/apple-touch-icon.png | 200 | text/html; charset=utf-8 | 0×0 | failed | 100 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | education-khan | apple-touch-icon-precomposed | https://www.khanacademy.org/apple-touch-icon-precomposed.png | 200 | text/html; charset=utf-8 | 0×0 | failed | 15 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | education-khan | favicon.svg | https://www.khanacademy.org/favicon.svg | 200 | text/html; charset=utf-8 | 0×0 | failed | 13 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | education-khan | favicon-32x32.png | https://www.khanacademy.org/favicon-32x32.png | 200 | text/html; charset=utf-8 | 0×0 | failed | 11 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | education-khan | favicon.ico | https://www.khanacademy.org/favicon.ico | 200 | image/vnd.microsoft.icon | 32×32 | loaded | 27 | — | unauthenticated-http-probe | — |
| chromium-extension | education-arxiv | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Farxiv.org%2F&size=128 | 200 | — | 64×64 | loaded | 3 | — | browser | default-globe-placeholder |
| chromium-extension | education-arxiv | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Farxiv.org%2F&size=64 | 200 | — | 64×64 | loaded | 2 | — | browser | default-globe-placeholder |
| chromium-extension | education-arxiv | apple-touch-icon | https://arxiv.org/apple-touch-icon.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 186 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | education-arxiv | apple-touch-icon-precomposed | https://arxiv.org/apple-touch-icon-precomposed.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 5 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | education-arxiv | favicon.svg | https://arxiv.org/favicon.svg | 404 | text/html; charset=utf-8 | 0×0 | failed | 295 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | education-arxiv | favicon-32x32.png | https://arxiv.org/favicon-32x32.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 299 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | education-arxiv | favicon.ico | https://arxiv.org/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 8 | — | unauthenticated-http-probe | — |
| chromium-extension | travel-airbnb | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.airbnb.com%2F&size=128 | 200 | — | 64×64 | loaded | 5 | — | browser | default-globe-placeholder |
| chromium-extension | travel-airbnb | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.airbnb.com%2F&size=64 | 200 | — | 64×64 | loaded | 4 | — | browser | default-globe-placeholder |
| chromium-extension | travel-airbnb | apple-touch-icon | https://www.airbnb.com/apple-touch-icon.png | 301 | text/html;charset=utf-8 | 0×0 | failed | 446 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | travel-airbnb | apple-touch-icon-precomposed | https://www.airbnb.com/apple-touch-icon-precomposed.png | 200 | image/png | 58×58 | loaded | 109 | — | browser | — |
| chromium-extension | travel-airbnb | favicon.svg | https://www.airbnb.com/favicon.svg | 301 | text/html;charset=utf-8 | 0×0 | failed | 242 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | travel-airbnb | favicon-32x32.png | https://www.airbnb.com/favicon-32x32.png | 301 | text/html;charset=utf-8 | 0×0 | failed | 342 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | travel-airbnb | favicon.ico | https://www.airbnb.com/favicon.ico | 200 | image/vnd.microsoft.icon | 32×32 | loaded | 217 | — | unauthenticated-http-probe | — |
| chromium-extension | travel-booking | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.booking.com%2F&size=128 | 200 | — | 64×64 | loaded | 5 | — | browser | default-globe-placeholder |
| chromium-extension | travel-booking | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.booking.com%2F&size=64 | 200 | — | 64×64 | loaded | 3 | — | browser | default-globe-placeholder |
| chromium-extension | travel-booking | apple-touch-icon | https://www.booking.com/apple-touch-icon.png | 200 | image/png | 180×180 | loaded | 570 | — | browser | — |
| chromium-extension | travel-booking | apple-touch-icon-precomposed | https://www.booking.com/apple-touch-icon-precomposed.png | 200 | image/png | 180×180 | loaded | 208 | — | browser | — |
| chromium-extension | travel-booking | favicon.svg | https://www.booking.com/favicon.svg | 404 | text/html; charset=UTF-8 | 0×0 | failed | 517 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | travel-booking | favicon-32x32.png | https://www.booking.com/favicon-32x32.png | 404 | text/html; charset=UTF-8 | 0×0 | failed | 467 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | travel-booking | favicon.ico | https://www.booking.com/favicon.ico | 404 | text/html | 0×0 | failed | 179 | — | unauthenticated-http-probe | image-decode-or-policy-error-http-404 |
| chromium-extension | travel-tripadvisor | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.tripadvisor.com%2F&size=128 | 200 | — | 64×64 | loaded | 4 | — | browser | default-globe-placeholder |
| chromium-extension | travel-tripadvisor | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.tripadvisor.com%2F&size=64 | 200 | — | 64×64 | loaded | 5 | — | browser | default-globe-placeholder |
| chromium-extension | travel-tripadvisor | apple-touch-icon | https://www.tripadvisor.com/apple-touch-icon.png | 200 | image/png | 180×180 | loaded | 206 | — | browser | — |
| chromium-extension | travel-tripadvisor | apple-touch-icon-precomposed | https://www.tripadvisor.com/apple-touch-icon-precomposed.png | 200 | image/png | 180×180 | loaded | 22 | — | browser | — |
| chromium-extension | travel-tripadvisor | favicon.svg | https://www.tripadvisor.com/favicon.svg | 404 | text/html;charset=UTF-8 | 0×0 | failed | 131 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | travel-tripadvisor | favicon-32x32.png | https://www.tripadvisor.com/favicon-32x32.png | 404 | text/html;charset=UTF-8 | 0×0 | failed | 180 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | travel-tripadvisor | favicon.ico | https://www.tripadvisor.com/favicon.ico | 200 | image/x-icon | 48×48 | loaded | 21 | — | unauthenticated-http-probe | — |
| chromium-extension | finance-paypal | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.paypal.com%2F&size=128 | 200 | — | 64×64 | loaded | 9 | — | browser | default-globe-placeholder |
| chromium-extension | finance-paypal | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.paypal.com%2F&size=64 | 200 | — | 64×64 | loaded | 5 | — | browser | default-globe-placeholder |
| chromium-extension | finance-paypal | apple-touch-icon | https://www.paypal.com/apple-touch-icon.png | 301 | text/html; charset=iso-8859-1 | 0×0 | failed | 342 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | finance-paypal | apple-touch-icon-precomposed | https://www.paypal.com/apple-touch-icon-precomposed.png | 301 | text/html; charset=iso-8859-1 | 0×0 | failed | 343 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | finance-paypal | favicon.svg | https://www.paypal.com/favicon.svg | 301 | text/html; charset=iso-8859-1 | 0×0 | failed | 332 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | finance-paypal | favicon-32x32.png | https://www.paypal.com/favicon-32x32.png | 301 | text/html; charset=iso-8859-1 | 0×0 | failed | 410 | — | browser | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | finance-paypal | favicon.ico | https://www.paypal.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 90 | — | unauthenticated-http-probe | — |
| chromium-extension | finance-stripe | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fstripe.com%2F&size=128 | 200 | — | 64×64 | loaded | 9 | — | browser | default-globe-placeholder |
| chromium-extension | finance-stripe | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fstripe.com%2F&size=64 | 200 | — | 64×64 | loaded | 5 | — | browser | default-globe-placeholder |
| chromium-extension | finance-stripe | apple-touch-icon | https://stripe.com/apple-touch-icon.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 178 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | finance-stripe | apple-touch-icon-precomposed | https://stripe.com/apple-touch-icon-precomposed.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 149 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | finance-stripe | favicon.svg | https://stripe.com/favicon.svg | 404 | text/html; charset=utf-8 | 0×0 | failed | 150 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | finance-stripe | favicon-32x32.png | https://stripe.com/favicon-32x32.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 133 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | finance-stripe | favicon.ico | https://stripe.com/favicon.ico | 200 | image/vnd.microsoft.icon; charset=utf-8 | 48×48 | loaded | 126 | — | unauthenticated-http-probe | — |
| chromium-extension | finance-coinbase | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.coinbase.com%2F&size=128 | 200 | — | 64×64 | loaded | 4 | — | browser | default-globe-placeholder |
| chromium-extension | finance-coinbase | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.coinbase.com%2F&size=64 | 200 | — | 64×64 | loaded | 5 | — | browser | default-globe-placeholder |
| chromium-extension | finance-coinbase | apple-touch-icon | https://www.coinbase.com/apple-touch-icon.png | 200 | image/png | 512×512 | loaded | 51 | — | browser | — |
| chromium-extension | finance-coinbase | apple-touch-icon-precomposed | https://www.coinbase.com/apple-touch-icon-precomposed.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 96 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | finance-coinbase | favicon.svg | https://www.coinbase.com/favicon.svg | 404 | text/html; charset=utf-8 | 0×0 | failed | 81 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | finance-coinbase | favicon-32x32.png | https://www.coinbase.com/favicon-32x32.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 93 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | finance-coinbase | favicon.ico | https://www.coinbase.com/favicon.ico | 200 | image/vnd.microsoft.icon | 32×32 | loaded | 27 | — | unauthenticated-http-probe | — |
| chromium-extension | messaging-whatsapp | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.whatsapp.com%2F&size=128 | 200 | — | 64×64 | loaded | 3 | — | browser | default-globe-placeholder |
| chromium-extension | messaging-whatsapp | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fwww.whatsapp.com%2F&size=64 | 200 | — | 64×64 | loaded | 7 | — | browser | default-globe-placeholder |
| chromium-extension | messaging-whatsapp | apple-touch-icon | https://www.whatsapp.com/apple-touch-icon.png | 200 | image/png | 0×0 | failed | 46 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| chromium-extension | messaging-whatsapp | apple-touch-icon-precomposed | https://www.whatsapp.com/apple-touch-icon-precomposed.png | 200 | image/png | 0×0 | failed | 33 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| chromium-extension | messaging-whatsapp | favicon.svg | https://www.whatsapp.com/favicon.svg | 404 | text/html; charset="utf-8" | 0×0 | failed | 29 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| chromium-extension | messaging-whatsapp | favicon-32x32.png | https://www.whatsapp.com/favicon-32x32.png | 404 | text/html; charset="utf-8" | 0×0 | failed | 26 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| chromium-extension | messaging-whatsapp | favicon.ico | https://www.whatsapp.com/favicon.ico | 200 | image/png | 0×0 | failed | 26 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| chromium-extension | messaging-telegram | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Ftelegram.org%2F&size=128 | 200 | — | 64×64 | loaded | 6 | — | browser | default-globe-placeholder |
| chromium-extension | messaging-telegram | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Ftelegram.org%2F&size=64 | 200 | — | 64×64 | loaded | 4 | — | browser | default-globe-placeholder |
| chromium-extension | messaging-telegram | apple-touch-icon | https://telegram.org/apple-touch-icon.png | 200 | text/html; charset=utf-8 | 0×0 | failed | 300 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | messaging-telegram | apple-touch-icon-precomposed | https://telegram.org/apple-touch-icon-precomposed.png | 200 | text/html; charset=utf-8 | 0×0 | failed | 116 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | messaging-telegram | favicon.svg | https://telegram.org/favicon.svg | 200 | text/html; charset=utf-8 | 0×0 | failed | 112 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | messaging-telegram | favicon-32x32.png | https://telegram.org/favicon-32x32.png | 200 | text/html; charset=utf-8 | 0×0 | failed | 110 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | messaging-telegram | favicon.ico | https://telegram.org/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 99 | — | unauthenticated-http-probe | — |
| chromium-extension | messaging-discord | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fdiscord.com%2F&size=128 | 200 | — | 64×64 | loaded | 4 | — | browser | default-globe-placeholder |
| chromium-extension | messaging-discord | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fdiscord.com%2F&size=64 | 200 | — | 64×64 | loaded | 5 | — | browser | default-globe-placeholder |
| chromium-extension | messaging-discord | apple-touch-icon | https://discord.com/apple-touch-icon.png | 404 | text/html | 0×0 | failed | 188 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | messaging-discord | apple-touch-icon-precomposed | https://discord.com/apple-touch-icon-precomposed.png | 404 | text/html | 0×0 | failed | 150 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | messaging-discord | favicon.svg | https://discord.com/favicon.svg | 404 | text/html | 0×0 | failed | 142 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | messaging-discord | favicon-32x32.png | https://discord.com/favicon-32x32.png | 404 | text/html | 0×0 | failed | 124 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | messaging-discord | favicon.ico | https://discord.com/favicon.ico | 404 | text/html | 0×0 | failed | 124 | — | unauthenticated-http-probe | image-decode-or-policy-error-http-404 |
| chromium-extension | productivity-trello | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Ftrello.com%2F&size=128 | 200 | — | 64×64 | loaded | 5 | — | browser | default-globe-placeholder |
| chromium-extension | productivity-trello | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Ftrello.com%2F&size=64 | 200 | — | 64×64 | loaded | 5 | — | browser | default-globe-placeholder |
| chromium-extension | productivity-trello | apple-touch-icon | https://trello.com/apple-touch-icon.png | 200 | text/html; charset=utf-8 | 0×0 | failed | 509 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | productivity-trello | apple-touch-icon-precomposed | https://trello.com/apple-touch-icon-precomposed.png | 200 | text/html; charset=utf-8 | 0×0 | failed | 176 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | productivity-trello | favicon.svg | https://trello.com/favicon.svg | 200 | text/html; charset=utf-8 | 0×0 | failed | 196 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | productivity-trello | favicon-32x32.png | https://trello.com/favicon-32x32.png | 200 | text/html; charset=utf-8 | 0×0 | failed | 214 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | productivity-trello | favicon.ico | https://trello.com/favicon.ico | 200 | image/vnd.microsoft.icon | 256×256 | loaded | 255 | — | unauthenticated-http-probe | — |
| chromium-extension | productivity-asana | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fasana.com%2F&size=128 | 200 | — | 64×64 | loaded | 6 | — | browser | default-globe-placeholder |
| chromium-extension | productivity-asana | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Fasana.com%2F&size=64 | 200 | — | 64×64 | loaded | 4 | — | browser | default-globe-placeholder |
| chromium-extension | productivity-asana | apple-touch-icon | https://asana.com/apple-touch-icon.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 137 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | productivity-asana | apple-touch-icon-precomposed | https://asana.com/apple-touch-icon-precomposed.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 54 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | productivity-asana | favicon.svg | https://asana.com/favicon.svg | 404 | text/html; charset=utf-8 | 0×0 | failed | 74 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | productivity-asana | favicon-32x32.png | https://asana.com/favicon-32x32.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 55 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | productivity-asana | favicon.ico | https://asana.com/favicon.ico | 200 | image/vnd.microsoft.icon | 48×48 | loaded | 18 | — | unauthenticated-http-probe | — |
| chromium-extension | productivity-linear | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Flinear.app%2F&size=128 | 200 | — | 64×64 | loaded | 3 | — | browser | default-globe-placeholder |
| chromium-extension | productivity-linear | chrome-_favicon | chrome-extension://bajbejikadjblkeimihgbiapggcpknek/_favicon/?pageUrl=https%3A%2F%2Flinear.app%2F&size=64 | 200 | — | 64×64 | loaded | 9 | — | browser | default-globe-placeholder |
| chromium-extension | productivity-linear | apple-touch-icon | https://linear.app/apple-touch-icon.png | 200 | text/html | 0×0 | failed | 39 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | productivity-linear | apple-touch-icon-precomposed | https://linear.app/apple-touch-icon-precomposed.png | 200 | text/html | 0×0 | failed | 24 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | productivity-linear | favicon.svg | https://linear.app/favicon.svg | 200 | text/html | 0×0 | failed | 24 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | productivity-linear | favicon-32x32.png | https://linear.app/favicon-32x32.png | 200 | text/html | 0×0 | failed | 30 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| chromium-extension | productivity-linear | favicon.ico | https://linear.app/favicon.ico | 200 | image/x-icon | 48×48 | loaded | 27 | — | unauthenticated-http-probe | — |
| web | starter-youtube | apple-touch-icon | https://www.youtube.com/apple-touch-icon.png | 404 | text/html; charset=ISO-8859-1 | 0×0 | failed | 103 | cross-origin | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | starter-youtube | apple-touch-icon-precomposed | https://www.youtube.com/apple-touch-icon-precomposed.png | 404 | text/html; charset=ISO-8859-1 | 0×0 | failed | 67 | cross-origin | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | starter-youtube | favicon.svg | https://www.youtube.com/favicon.svg | 404 | text/html; charset=utf-8 | 0×0 | failed | 130 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | starter-youtube | favicon-32x32.png | https://www.youtube.com/favicon-32x32.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 78 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | starter-youtube | favicon.ico | https://www.youtube.com/favicon.ico | 200 | image/x-icon | 16×16 | loaded | 12 | cross-origin | unauthenticated-http-probe | — |
| web | starter-gmail | apple-touch-icon | https://mail.google.com/apple-touch-icon.png | 301 | text/html; charset=UTF-8 | 0×0 | failed | 213 | cross-origin | browser | net::ERR_BLOCKED_BY_ORB |
| web | starter-gmail | apple-touch-icon-precomposed | https://mail.google.com/apple-touch-icon-precomposed.png | 301 | text/html; charset=UTF-8 | 0×0 | failed | 116 | cross-origin | browser | net::ERR_BLOCKED_BY_ORB |
| web | starter-gmail | favicon.svg | https://mail.google.com/favicon.svg | 301 | text/html; charset=UTF-8 | 0×0 | failed | 118 | cross-origin | browser | net::ERR_BLOCKED_BY_ORB |
| web | starter-gmail | favicon-32x32.png | https://mail.google.com/favicon-32x32.png | 301 | text/html; charset=UTF-8 | 0×0 | failed | 117 | cross-origin | browser | net::ERR_BLOCKED_BY_ORB |
| web | starter-gmail | favicon.ico | https://mail.google.com/favicon.ico | 200 | image/x-icon | 0×0 | failed | 40 | cross-origin | unauthenticated-http-probe | image-decode-or-policy-error-http-200 |
| web | starter-maps | apple-touch-icon | https://maps.google.com/apple-touch-icon.png | 404 | text/html; charset=UTF-8 | 0×0 | failed | 171 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | starter-maps | apple-touch-icon-precomposed | https://maps.google.com/apple-touch-icon-precomposed.png | 404 | text/html; charset=UTF-8 | 0×0 | failed | 107 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | starter-maps | favicon.svg | https://maps.google.com/favicon.svg | 404 | text/html; charset=UTF-8 | 0×0 | failed | 114 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | starter-maps | favicon-32x32.png | https://maps.google.com/favicon-32x32.png | 404 | text/html; charset=UTF-8 | 0×0 | failed | 110 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | starter-maps | favicon.ico | https://maps.google.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 13 | cross-origin | unauthenticated-http-probe | — |
| web | starter-wikipedia | apple-touch-icon | https://www.wikipedia.org/apple-touch-icon.png | 200 | image/png | 160×160 | loaded | 86 | — | browser | — |
| web | starter-wikipedia | apple-touch-icon-precomposed | https://www.wikipedia.org/apple-touch-icon-precomposed.png | 301 | text/html; charset=iso-8859-1 | 0×0 | failed | 45 | — | browser | net::ERR_BLOCKED_BY_ORB |
| web | starter-wikipedia | favicon.svg | https://www.wikipedia.org/favicon.svg | 301 | text/html; charset=iso-8859-1 | 0×0 | failed | 50 | — | browser | net::ERR_BLOCKED_BY_ORB |
| web | starter-wikipedia | favicon-32x32.png | https://www.wikipedia.org/favicon-32x32.png | 301 | text/html; charset=iso-8859-1 | 0×0 | failed | 44 | — | browser | net::ERR_BLOCKED_BY_ORB |
| web | starter-wikipedia | favicon.ico | https://www.wikipedia.org/favicon.ico | 200 | image/vnd.microsoft.icon | 48×48 | loaded | 45 | — | unauthenticated-http-probe | — |
| web | starter-reddit | apple-touch-icon | https://www.reddit.com/apple-touch-icon.png | 200 | image/png | 57×57 | loaded | 37 | — | browser | — |
| web | starter-reddit | apple-touch-icon-precomposed | https://www.reddit.com/apple-touch-icon-precomposed.png | 200 | image/png | 128×128 | loaded | 16 | — | browser | — |
| web | starter-reddit | favicon.svg | https://www.reddit.com/favicon.svg | 403 | application/xml | 0×0 | failed | 76 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | starter-reddit | favicon-32x32.png | https://www.reddit.com/favicon-32x32.png | 403 | application/xml | 0×0 | failed | 83 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | starter-reddit | favicon.ico | https://www.reddit.com/favicon.ico | 200 | image/vnd.microsoft.icon | 32×32 | loaded | 12 | — | unauthenticated-http-probe | — |
| web | starter-amazon | apple-touch-icon | https://www.amazon.com/apple-touch-icon.png | 404 | text/html;charset=UTF-8 | 0×0 | failed | 150 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | starter-amazon | apple-touch-icon-precomposed | https://www.amazon.com/apple-touch-icon-precomposed.png | 404 | text/html;charset=UTF-8 | 0×0 | failed | 106 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | starter-amazon | favicon.svg | https://www.amazon.com/favicon.svg | 404 | text/html;charset=UTF-8 | 0×0 | failed | 107 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | starter-amazon | favicon-32x32.png | https://www.amazon.com/favicon-32x32.png | 404 | text/html;charset=UTF-8 | 0×0 | failed | 98 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | starter-amazon | favicon.ico | https://www.amazon.com/favicon.ico | 200 | image/x-icon | 48×48 | loaded | 29 | — | unauthenticated-http-probe | — |
| web | starter-chatgpt | apple-touch-icon | https://chatgpt.com/apple-touch-icon.png | 404 | — | 0×0 | failed | 46 | — | browser | image-decode-or-policy-error-http-404 |
| web | starter-chatgpt | apple-touch-icon-precomposed | https://chatgpt.com/apple-touch-icon-precomposed.png | 404 | — | 0×0 | failed | 28 | — | browser | image-decode-or-policy-error-http-404 |
| web | starter-chatgpt | favicon.svg | https://chatgpt.com/favicon.svg | 404 | — | 0×0 | failed | 73 | — | browser | image-decode-or-policy-error-http-404 |
| web | starter-chatgpt | favicon-32x32.png | https://chatgpt.com/favicon-32x32.png | 404 | — | 0×0 | failed | 49 | — | browser | image-decode-or-policy-error-http-404 |
| web | starter-chatgpt | favicon.ico | https://chatgpt.com/favicon.ico | 200 | image/x-icon | 64×64 | loaded | 24 | — | unauthenticated-http-probe | — |
| web | starter-outlook | apple-touch-icon | https://outlook.live.com/apple-touch-icon.png | 302 | text/plain | 0×0 | failed | 63 | — | browser | net::ERR_BLOCKED_BY_ORB |
| web | starter-outlook | apple-touch-icon-precomposed | https://outlook.live.com/apple-touch-icon-precomposed.png | 302 | text/plain | 0×0 | failed | 49 | — | browser | net::ERR_BLOCKED_BY_ORB |
| web | starter-outlook | favicon.svg | https://outlook.live.com/favicon.svg | 302 | text/plain | 0×0 | failed | 34 | — | browser | net::ERR_BLOCKED_BY_ORB |
| web | starter-outlook | favicon-32x32.png | https://outlook.live.com/favicon-32x32.png | 302 | text/plain | 0×0 | failed | 26 | — | browser | net::ERR_BLOCKED_BY_ORB |
| web | starter-outlook | favicon.ico | https://outlook.live.com/favicon.ico | 200 | text/html | 0×0 | failed | 22 | — | unauthenticated-http-probe | image-decode-or-policy-error-http-200 |
| web | claude-new | apple-touch-icon | https://claude.ai/apple-touch-icon.png | 200 | image/png | 180×180 | loaded | 71 | cross-origin | browser | — |
| web | claude-new | apple-touch-icon-precomposed | https://claude.ai/apple-touch-icon-precomposed.png | 404 | text/plain; charset=UTF-8 | 0×0 | failed | 16 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| web | claude-new | favicon.svg | https://claude.ai/favicon.svg | 200 | image/svg+xml | 0×0 | failed | 24 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| web | claude-new | favicon-32x32.png | https://claude.ai/favicon-32x32.png | 200 | image/png | 0×0 | failed | 149 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| web | claude-new | favicon.ico | https://claude.ai/favicon.ico | 200 | image/vnd.microsoft.icon | 0×0 | failed | 32 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| web | search-google | apple-touch-icon | https://www.google.com/apple-touch-icon.png | 404 | text/html; charset=UTF-8 | 0×0 | failed | 108 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | search-google | apple-touch-icon-precomposed | https://www.google.com/apple-touch-icon-precomposed.png | 404 | text/html; charset=UTF-8 | 0×0 | failed | 114 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | search-google | favicon.svg | https://www.google.com/favicon.svg | 404 | text/html; charset=UTF-8 | 0×0 | failed | 108 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | search-google | favicon-32x32.png | https://www.google.com/favicon-32x32.png | 404 | text/html; charset=UTF-8 | 0×0 | failed | 108 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | search-google | favicon.ico | https://www.google.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 12 | cross-origin | unauthenticated-http-probe | — |
| web | search-bing | apple-touch-icon | https://www.bing.com/apple-touch-icon.png | 200 | image/png | 57×57 | loaded | 98 | — | browser | — |
| web | search-bing | apple-touch-icon-precomposed | https://www.bing.com/apple-touch-icon-precomposed.png | 200 | image/png | 57×57 | loaded | 18 | — | browser | — |
| web | search-bing | favicon.svg | https://www.bing.com/favicon.svg | 404 | text/html | 0×0 | failed | 80 | — | browser | image-decode-or-policy-error-http-404 |
| web | search-bing | favicon-32x32.png | https://www.bing.com/favicon-32x32.png | 404 | text/html | 0×0 | failed | 140 | — | browser | image-decode-or-policy-error-http-404 |
| web | search-bing | favicon.ico | https://www.bing.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 55 | — | unauthenticated-http-probe | — |
| web | search-duckduckgo | apple-touch-icon | https://duckduckgo.com/apple-touch-icon.png | 410 | text/html; charset=UTF-8 | 0×0 | failed | 108 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | search-duckduckgo | apple-touch-icon-precomposed | https://duckduckgo.com/apple-touch-icon-precomposed.png | 410 | text/html; charset=UTF-8 | 0×0 | failed | 35 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | search-duckduckgo | favicon.svg | https://duckduckgo.com/favicon.svg | 410 | text/html; charset=UTF-8 | 0×0 | failed | 31 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | search-duckduckgo | favicon-32x32.png | https://duckduckgo.com/favicon-32x32.png | 410 | text/html; charset=UTF-8 | 0×0 | failed | 38 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | search-duckduckgo | favicon.ico | https://duckduckgo.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 35 | — | unauthenticated-http-probe | — |
| web | search-baidu | apple-touch-icon | https://www.baidu.com/apple-touch-icon.png | 404 | text/html; charset=iso-8859-1 | 0×0 | failed | 644 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | search-baidu | apple-touch-icon-precomposed | https://www.baidu.com/apple-touch-icon-precomposed.png | 404 | text/html; charset=iso-8859-1 | 0×0 | failed | 836 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | search-baidu | favicon.svg | https://www.baidu.com/favicon.svg | 404 | text/html; charset=iso-8859-1 | 0×0 | failed | 630 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | search-baidu | favicon-32x32.png | https://www.baidu.com/favicon-32x32.png | 404 | text/html; charset=iso-8859-1 | 0×0 | failed | 615 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | search-baidu | favicon.ico | https://www.baidu.com/favicon.ico | 200 | image/x-icon | 64×64 | loaded | 880 | — | unauthenticated-http-probe | — |
| web | mail-yahoo | apple-touch-icon | https://mail.yahoo.com/apple-touch-icon.png | 404 | text/html | 0×0 | failed | 65 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | mail-yahoo | apple-touch-icon-precomposed | https://mail.yahoo.com/apple-touch-icon-precomposed.png | 404 | text/html | 0×0 | failed | 72 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | mail-yahoo | favicon.svg | https://mail.yahoo.com/favicon.svg | 302 | text/plain; charset=utf-8 | 0×0 | failed | 144 | — | browser | net::ERR_BLOCKED_BY_ORB |
| web | mail-yahoo | favicon-32x32.png | https://mail.yahoo.com/favicon-32x32.png | 302 | text/plain; charset=utf-8 | 0×0 | failed | 157 | — | browser | net::ERR_BLOCKED_BY_ORB |
| web | mail-yahoo | favicon.ico | https://mail.yahoo.com/favicon.ico | 200 | image/vnd.microsoft.icon | 48×48 | loaded | 12 | — | unauthenticated-http-probe | — |
| web | mail-proton | apple-touch-icon | https://proton.me/apple-touch-icon.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 342 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | mail-proton | apple-touch-icon-precomposed | https://proton.me/apple-touch-icon-precomposed.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 134 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | mail-proton | favicon.svg | https://proton.me/favicon.svg | 404 | text/html; charset=utf-8 | 0×0 | failed | 152 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | mail-proton | favicon-32x32.png | https://proton.me/favicon-32x32.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 160 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | mail-proton | favicon.ico | https://proton.me/favicon.ico | 200 | image/vnd.microsoft.icon | 48×48 | loaded | 134 | — | unauthenticated-http-probe | — |
| web | mail-icloud | apple-touch-icon | https://www.icloud.com/apple-touch-icon.png | 404 | text/html | 0×0 | failed | 60 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | mail-icloud | apple-touch-icon-precomposed | https://www.icloud.com/apple-touch-icon-precomposed.png | 404 | text/html | 0×0 | failed | 48 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | mail-icloud | favicon.svg | https://www.icloud.com/favicon.svg | 404 | text/html | 0×0 | failed | 83 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | mail-icloud | favicon-32x32.png | https://www.icloud.com/favicon-32x32.png | 404 | text/html | 0×0 | failed | 95 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | mail-icloud | favicon.ico | https://www.icloud.com/favicon.ico | 200 | image/x-icon | 48×48 | loaded | 26 | — | unauthenticated-http-probe | — |
| web | maps-apple | apple-touch-icon | https://maps.apple.com/apple-touch-icon.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 200 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| web | maps-apple | apple-touch-icon-precomposed | https://maps.apple.com/apple-touch-icon-precomposed.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 72 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| web | maps-apple | favicon.svg | https://maps.apple.com/favicon.svg | 404 | text/html; charset=utf-8 | 0×0 | failed | 80 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| web | maps-apple | favicon-32x32.png | https://maps.apple.com/favicon-32x32.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 130 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| web | maps-apple | favicon.ico | https://maps.apple.com/favicon.ico | 200 | image/x-icon | 64×64 | loaded | 38 | — | unauthenticated-http-probe | — |
| web | maps-openstreetmap | apple-touch-icon | https://www.openstreetmap.org/apple-touch-icon.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 293 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | maps-openstreetmap | apple-touch-icon-precomposed | https://www.openstreetmap.org/apple-touch-icon-precomposed.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 285 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | maps-openstreetmap | favicon.svg | https://www.openstreetmap.org/favicon.svg | 404 | text/html; charset=utf-8 | 0×0 | failed | 278 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | maps-openstreetmap | favicon-32x32.png | https://www.openstreetmap.org/favicon-32x32.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 292 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | maps-openstreetmap | favicon.ico | https://www.openstreetmap.org/favicon.ico | 200 | image/vnd.microsoft.icon | 48×48 | loaded | 302 | — | unauthenticated-http-probe | — |
| web | social-x | apple-touch-icon | https://x.com/apple-touch-icon.png | 200 | image/png | 0×0 | failed | 90 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| web | social-x | apple-touch-icon-precomposed | https://x.com/apple-touch-icon-precomposed.png | 404 | text/html;charset=utf-8 | 0×0 | failed | 55 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| web | social-x | favicon.svg | https://x.com/favicon.svg | 404 | text/html; charset=UTF-8 | 0×0 | failed | 69 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| web | social-x | favicon-32x32.png | https://x.com/favicon-32x32.png | 404 | text/html; charset=UTF-8 | 0×0 | failed | 59 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| web | social-x | favicon.ico | https://x.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 59 | — | unauthenticated-http-probe | — |
| web | social-facebook | apple-touch-icon | https://www.facebook.com/apple-touch-icon.png | 200 | image/png | 180×180 | loaded | 60 | cross-origin | browser | — |
| web | social-facebook | apple-touch-icon-precomposed | https://www.facebook.com/apple-touch-icon-precomposed.png | 200 | image/png | 180×180 | loaded | 39 | cross-origin | browser | — |
| web | social-facebook | favicon.svg | https://www.facebook.com/favicon.svg | 302 | text/html; charset="utf-8" | 0×0 | failed | 83 | same-origin | browser | blocked-by-corp-same-origin |
| web | social-facebook | favicon-32x32.png | https://www.facebook.com/favicon-32x32.png | 302 | text/html; charset="utf-8" | 0×0 | failed | 92 | same-origin | browser | blocked-by-corp-same-origin |
| web | social-facebook | favicon.ico | https://www.facebook.com/favicon.ico | 200 | image/png | 60×60 | loaded | 53 | cross-origin | unauthenticated-http-probe | — |
| web | social-instagram | apple-touch-icon | https://www.instagram.com/apple-touch-icon.png | 302 | text/html; charset="utf-8" | 0×0 | failed | 194 | same-origin | browser | blocked-by-corp-same-origin |
| web | social-instagram | apple-touch-icon-precomposed | https://www.instagram.com/apple-touch-icon-precomposed.png | 302 | text/html; charset="utf-8" | 0×0 | failed | 193 | same-origin | browser | blocked-by-corp-same-origin |
| web | social-instagram | favicon.svg | https://www.instagram.com/favicon.svg | 302 | text/html; charset="utf-8" | 0×0 | failed | 155 | same-origin | browser | blocked-by-corp-same-origin |
| web | social-instagram | favicon-32x32.png | https://www.instagram.com/favicon-32x32.png | 302 | text/html; charset="utf-8" | 0×0 | failed | 189 | same-origin | browser | blocked-by-corp-same-origin |
| web | social-instagram | favicon.ico | https://www.instagram.com/favicon.ico | 200 | image/png | 0×0 | failed | 155 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| web | social-linkedin | apple-touch-icon | https://www.linkedin.com/apple-touch-icon.png | 404 | — | 0×0 | failed | 147 | — | browser | image-decode-or-policy-error-http-404 |
| web | social-linkedin | apple-touch-icon-precomposed | https://www.linkedin.com/apple-touch-icon-precomposed.png | 404 | — | 0×0 | failed | 123 | — | browser | image-decode-or-policy-error-http-404 |
| web | social-linkedin | favicon.svg | https://www.linkedin.com/favicon.svg | 404 | text/html | 0×0 | failed | 99 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | social-linkedin | favicon-32x32.png | https://www.linkedin.com/favicon-32x32.png | 404 | text/html | 0×0 | failed | 106 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | social-linkedin | favicon.ico | https://www.linkedin.com/favicon.ico | 200 | image/x-icon | 64×64 | loaded | 145 | — | unauthenticated-http-probe | — |
| web | social-weibo | apple-touch-icon | https://weibo.com/apple-touch-icon.png | 302 | text/html; charset=utf-8 | 0×0 | failed | 2756 | — | browser | net::ERR_BLOCKED_BY_ORB |
| web | social-weibo | apple-touch-icon-precomposed | https://weibo.com/apple-touch-icon-precomposed.png | 302 | text/html; charset=utf-8 | 0×0 | failed | 561 | — | browser | net::ERR_BLOCKED_BY_ORB |
| web | social-weibo | favicon.svg | https://weibo.com/favicon.svg | 302 | text/html; charset=utf-8 | 0×0 | failed | 574 | — | browser | net::ERR_BLOCKED_BY_ORB |
| web | social-weibo | favicon-32x32.png | https://weibo.com/favicon-32x32.png | 302 | text/html; charset=utf-8 | 0×0 | failed | 557 | — | browser | net::ERR_BLOCKED_BY_ORB |
| web | social-weibo | favicon.ico | https://weibo.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 614 | — | unauthenticated-http-probe | — |
| web | video-bilibili | apple-touch-icon | https://www.bilibili.com/apple-touch-icon.png | 404 | text/html | 0×0 | failed | 378 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | video-bilibili | apple-touch-icon-precomposed | https://www.bilibili.com/apple-touch-icon-precomposed.png | 404 | text/html | 0×0 | failed | 237 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | video-bilibili | favicon.svg | https://www.bilibili.com/favicon.svg | 404 | text/html | 0×0 | failed | 238 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | video-bilibili | favicon-32x32.png | https://www.bilibili.com/favicon-32x32.png | 404 | text/html | 0×0 | failed | 244 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | video-bilibili | favicon.ico | https://www.bilibili.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 71 | — | unauthenticated-http-probe | — |
| web | video-netflix | apple-touch-icon | https://www.netflix.com/apple-touch-icon.png | 302 | text/html; charset=utf-8 | 0×0 | failed | 173 | — | browser | net::ERR_BLOCKED_BY_ORB |
| web | video-netflix | apple-touch-icon-precomposed | https://www.netflix.com/apple-touch-icon-precomposed.png | 302 | text/html; charset=utf-8 | 0×0 | failed | 98 | — | browser | net::ERR_BLOCKED_BY_ORB |
| web | video-netflix | favicon.svg | https://www.netflix.com/favicon.svg | 302 | text/html; charset=utf-8 | 0×0 | failed | 81 | — | browser | net::ERR_BLOCKED_BY_ORB |
| web | video-netflix | favicon-32x32.png | https://www.netflix.com/favicon-32x32.png | 302 | text/html; charset=utf-8 | 0×0 | failed | 87 | — | browser | net::ERR_BLOCKED_BY_ORB |
| web | video-netflix | favicon.ico | https://www.netflix.com/favicon.ico | 200 | image/x-icon | 64×64 | loaded | 86 | — | unauthenticated-http-probe | — |
| web | video-twitch | apple-touch-icon | https://www.twitch.tv/apple-touch-icon.png | 200 | image/png | 180×180 | loaded | 37 | — | browser | — |
| web | video-twitch | apple-touch-icon-precomposed | https://www.twitch.tv/apple-touch-icon-precomposed.png | 200 | text/html | 0×0 | failed | 17 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | video-twitch | favicon.svg | https://www.twitch.tv/favicon.svg | 200 | text/html | 0×0 | failed | 22 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | video-twitch | favicon-32x32.png | https://www.twitch.tv/favicon-32x32.png | 200 | text/html | 0×0 | failed | 25 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | video-twitch | favicon.ico | https://www.twitch.tv/favicon.ico | 200 | application/octet-stream | 32×32 | loaded | 12 | — | unauthenticated-http-probe | content-type-application/octet-stream |
| web | ecommerce-ebay | apple-touch-icon | https://www.ebay.com/apple-touch-icon.png | 200 | image/png | 60×60 | loaded | 411 | — | browser | — |
| web | ecommerce-ebay | apple-touch-icon-precomposed | https://www.ebay.com/apple-touch-icon-precomposed.png | 302 | text/html;charset=UTF-8 | 0×0 | failed | 195 | — | browser | net::ERR_BLOCKED_BY_ORB |
| web | ecommerce-ebay | favicon.svg | https://www.ebay.com/favicon.svg | 302 | text/html;charset=UTF-8 | 0×0 | failed | 295 | — | browser | net::ERR_BLOCKED_BY_ORB |
| web | ecommerce-ebay | favicon-32x32.png | https://www.ebay.com/favicon-32x32.png | 302 | text/html;charset=UTF-8 | 0×0 | failed | 432 | — | browser | net::ERR_BLOCKED_BY_ORB |
| web | ecommerce-ebay | favicon.ico | https://www.ebay.com/favicon.ico | 200 | image/x-icon | 16×16 | loaded | 66 | — | unauthenticated-http-probe | — |
| web | ecommerce-taobao | apple-touch-icon | https://www.taobao.com/apple-touch-icon.png | 302 | text/html | 0×0 | failed | 1244 | — | browser | net::ERR_BLOCKED_BY_ORB |
| web | ecommerce-taobao | apple-touch-icon-precomposed | https://www.taobao.com/apple-touch-icon-precomposed.png | 302 | text/html | 0×0 | failed | 1233 | — | browser | net::ERR_BLOCKED_BY_ORB |
| web | ecommerce-taobao | favicon.svg | https://www.taobao.com/favicon.svg | 302 | text/html | 0×0 | failed | 1098 | — | browser | net::ERR_BLOCKED_BY_ORB |
| web | ecommerce-taobao | favicon-32x32.png | https://www.taobao.com/favicon-32x32.png | 302 | text/html | 0×0 | failed | 1064 | — | browser | net::ERR_BLOCKED_BY_ORB |
| web | ecommerce-taobao | favicon.ico | https://www.taobao.com/favicon.ico | 200 | image/x-icon | 64×64 | loaded | 253 | — | unauthenticated-http-probe | — |
| web | ecommerce-jd | apple-touch-icon | https://www.jd.com/apple-touch-icon.png | 200 | text/html | 0×0 | failed | 350 | — | unauthenticated-http-probe | image-decode-or-policy-error-http-200 |
| web | ecommerce-jd | apple-touch-icon-precomposed | https://www.jd.com/apple-touch-icon-precomposed.png | 200 | text/html | 0×0 | failed | 387 | — | unauthenticated-http-probe | image-decode-or-policy-error-http-200 |
| web | ecommerce-jd | favicon.svg | https://www.jd.com/favicon.svg | 200 | text/html | 0×0 | failed | 330 | — | unauthenticated-http-probe | image-decode-or-policy-error-http-200 |
| web | ecommerce-jd | favicon-32x32.png | https://www.jd.com/favicon-32x32.png | 200 | text/html | 0×0 | failed | 344 | — | unauthenticated-http-probe | image-decode-or-policy-error-http-200 |
| web | ecommerce-jd | favicon.ico | https://www.jd.com/favicon.ico | 200 | image/x-icon | 48×48 | loaded | 25 | — | unauthenticated-http-probe | — |
| web | ai-gemini | apple-touch-icon | https://gemini.google.com/apple-touch-icon.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 105 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | ai-gemini | apple-touch-icon-precomposed | https://gemini.google.com/apple-touch-icon-precomposed.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 56 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | ai-gemini | favicon.svg | https://gemini.google.com/favicon.svg | 404 | text/html; charset=utf-8 | 0×0 | failed | 70 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | ai-gemini | favicon-32x32.png | https://gemini.google.com/favicon-32x32.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 70 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | ai-gemini | favicon.ico | https://gemini.google.com/favicon.ico | 404 | text/html; charset=utf-8 | 0×0 | failed | 67 | — | unauthenticated-http-probe | image-decode-or-policy-error-http-404 |
| web | ai-perplexity | apple-touch-icon | https://www.perplexity.ai/apple-touch-icon.png | 200 | image/png | 180×180 | loaded | 30 | cross-origin | browser | — |
| web | ai-perplexity | apple-touch-icon-precomposed | https://www.perplexity.ai/apple-touch-icon-precomposed.png | 404 | text/html; charset=UTF-8 | 0×0 | failed | 14 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| web | ai-perplexity | favicon.svg | https://www.perplexity.ai/favicon.svg | 200 | image/svg+xml | 360×360 | loaded | 16 | cross-origin | browser | — |
| web | ai-perplexity | favicon-32x32.png | https://www.perplexity.ai/favicon-32x32.png | 404 | text/html; charset=UTF-8 | 0×0 | failed | 15 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| web | ai-perplexity | favicon.ico | https://www.perplexity.ai/favicon.ico | 200 | image/x-icon | 48×48 | loaded | 17 | cross-origin | unauthenticated-http-probe | — |
| web | ai-copilot | apple-touch-icon | https://copilot.microsoft.com/apple-touch-icon.png | 301 | text/html; charset=UTF-8 | 0×0 | failed | 190 | — | browser | net::ERR_BLOCKED_BY_ORB |
| web | ai-copilot | apple-touch-icon-precomposed | https://copilot.microsoft.com/apple-touch-icon-precomposed.png | 301 | text/html; charset=UTF-8 | 0×0 | failed | 105 | — | browser | net::ERR_BLOCKED_BY_ORB |
| web | ai-copilot | favicon.svg | https://copilot.microsoft.com/favicon.svg | 301 | text/html; charset=UTF-8 | 0×0 | failed | 169 | — | browser | net::ERR_BLOCKED_BY_ORB |
| web | ai-copilot | favicon-32x32.png | https://copilot.microsoft.com/favicon-32x32.png | 301 | text/html; charset=UTF-8 | 0×0 | failed | 208 | — | browser | net::ERR_BLOCKED_BY_ORB |
| web | ai-copilot | favicon.ico | https://copilot.microsoft.com/favicon.ico | 200 | image/vnd.microsoft.icon | 48×48 | loaded | 22 | — | unauthenticated-http-probe | — |
| web | ai-deepseek | apple-touch-icon | https://www.deepseek.com/apple-touch-icon.png | 404 | text/html | 0×0 | failed | 93 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | ai-deepseek | apple-touch-icon-precomposed | https://www.deepseek.com/apple-touch-icon-precomposed.png | 202 | text/html; charset=UTF-8 | 0×0 | failed | 13 | — | browser | image-decode-or-policy-error-http-202 |
| web | ai-deepseek | favicon.svg | https://www.deepseek.com/favicon.svg | 202 | text/html; charset=UTF-8 | 0×0 | failed | 86 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | ai-deepseek | favicon-32x32.png | https://www.deepseek.com/favicon-32x32.png | 202 | text/html; charset=UTF-8 | 0×0 | failed | 98 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | ai-deepseek | favicon.ico | https://www.deepseek.com/favicon.ico | 202 | text/html; charset=UTF-8 | 225×225 | loaded | 15 | — | unauthenticated-http-probe | content-type-text/html; charset=UTF-8 |
| web | ai-kimi | apple-touch-icon | https://www.kimi.com/apple-touch-icon.png | 302 | text/plain; charset=utf-8 | 0×0 | failed | 508 | — | browser | net::ERR_BLOCKED_BY_ORB |
| web | ai-kimi | apple-touch-icon-precomposed | https://www.kimi.com/apple-touch-icon-precomposed.png | 302 | text/plain; charset=utf-8 | 0×0 | failed | 542 | — | browser | net::ERR_BLOCKED_BY_ORB |
| web | ai-kimi | favicon.svg | https://www.kimi.com/favicon.svg | 302 | text/plain; charset=utf-8 | 0×0 | failed | 547 | — | browser | net::ERR_BLOCKED_BY_ORB |
| web | ai-kimi | favicon-32x32.png | https://www.kimi.com/favicon-32x32.png | 302 | text/plain; charset=utf-8 | 0×0 | failed | 528 | — | browser | net::ERR_BLOCKED_BY_ORB |
| web | ai-kimi | favicon.ico | https://www.kimi.com/favicon.ico | 200 | — | 48×48 | loaded | 28 | — | unauthenticated-http-probe | — |
| web | dev-github | apple-touch-icon | https://github.com/apple-touch-icon.png | 200 | image/png | 120×120 | loaded | 133 | — | browser | — |
| web | dev-github | apple-touch-icon-precomposed | https://github.com/apple-touch-icon-precomposed.png | 404 | text/plain; charset=utf-8 | 0×0 | failed | 82 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | dev-github | favicon.svg | https://github.com/favicon.svg | 406 | image/svg+xml | 0×0 | failed | 117 | — | browser | image-decode-or-policy-error-http-406 |
| web | dev-github | favicon-32x32.png | https://github.com/favicon-32x32.png | 404 | text/plain; charset=utf-8 | 0×0 | failed | 102 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | dev-github | favicon.ico | https://github.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 33 | — | unauthenticated-http-probe | — |
| web | dev-gitlab | apple-touch-icon | https://gitlab.com/apple-touch-icon.png | 200 | image/png | 180×180 | loaded | 88 | — | browser | — |
| web | dev-gitlab | apple-touch-icon-precomposed | https://gitlab.com/apple-touch-icon-precomposed.png | 302 | text/html; charset=utf-8 | 0×0 | failed | 188 | same-origin | browser | bot-challenge |
| web | dev-gitlab | favicon.svg | https://gitlab.com/favicon.svg | 302 | text/html; charset=utf-8 | 0×0 | failed | 168 | same-origin | browser | bot-challenge |
| web | dev-gitlab | favicon-32x32.png | https://gitlab.com/favicon-32x32.png | 302 | text/html; charset=utf-8 | 0×0 | failed | 204 | same-origin | browser | bot-challenge |
| web | dev-gitlab | favicon.ico | https://gitlab.com/favicon.ico | 200 | image/png | 32×32 | loaded | 165 | — | unauthenticated-http-probe | — |
| web | dev-stackoverflow | apple-touch-icon | https://stackoverflow.com/apple-touch-icon.png | 429 | text/html; charset=UTF-8 | 0×0 | failed | 59 | same-origin | unauthenticated-http-probe | bot-challenge |
| web | dev-stackoverflow | apple-touch-icon-precomposed | https://stackoverflow.com/apple-touch-icon-precomposed.png | 429 | text/html; charset=UTF-8 | 0×0 | failed | 14 | same-origin | unauthenticated-http-probe | bot-challenge |
| web | dev-stackoverflow | favicon.svg | https://stackoverflow.com/favicon.svg | 429 | text/html; charset=UTF-8 | 0×0 | failed | 15 | same-origin | unauthenticated-http-probe | bot-challenge |
| web | dev-stackoverflow | favicon-32x32.png | https://stackoverflow.com/favicon-32x32.png | 429 | text/html; charset=UTF-8 | 0×0 | failed | 15 | same-origin | unauthenticated-http-probe | bot-challenge |
| web | dev-stackoverflow | favicon.ico | https://stackoverflow.com/favicon.ico | 429 | text/html; charset=UTF-8 | 0×0 | failed | 16 | same-origin | unauthenticated-http-probe | bot-challenge |
| web | dev-mdn | apple-touch-icon | https://developer.mozilla.org/apple-touch-icon.png | 200 | image/png | 192×192 | loaded | 34 | — | browser | — |
| web | dev-mdn | apple-touch-icon-precomposed | https://developer.mozilla.org/apple-touch-icon-precomposed.png | 404 | text/html | 0×0 | failed | 175 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | dev-mdn | favicon.svg | https://developer.mozilla.org/favicon.svg | 200 | image/svg+xml | 56×56 | loaded | 10 | — | browser | — |
| web | dev-mdn | favicon-32x32.png | https://developer.mozilla.org/favicon-32x32.png | 200 | image/png | 32×32 | loaded | 11 | — | browser | — |
| web | dev-mdn | favicon.ico | https://developer.mozilla.org/favicon.ico | 200 | image/x-icon | 48×48 | loaded | 15 | — | unauthenticated-http-probe | — |
| web | dev-npm | apple-touch-icon | https://www.npmjs.com/apple-touch-icon.png | 403 | text/html; charset=UTF-8 | 0×0 | failed | 34 | same-origin | unauthenticated-http-probe | bot-challenge |
| web | dev-npm | apple-touch-icon-precomposed | https://www.npmjs.com/apple-touch-icon-precomposed.png | 403 | text/html; charset=UTF-8 | 0×0 | failed | 16 | same-origin | unauthenticated-http-probe | bot-challenge |
| web | dev-npm | favicon.svg | https://www.npmjs.com/favicon.svg | 403 | text/html; charset=UTF-8 | 0×0 | failed | 18 | same-origin | unauthenticated-http-probe | bot-challenge |
| web | dev-npm | favicon-32x32.png | https://www.npmjs.com/favicon-32x32.png | 403 | text/html; charset=UTF-8 | 0×0 | failed | 16 | same-origin | unauthenticated-http-probe | bot-challenge |
| web | dev-npm | favicon.ico | https://www.npmjs.com/favicon.ico | 403 | text/html; charset=UTF-8 | 0×0 | failed | 20 | same-origin | unauthenticated-http-probe | bot-challenge |
| web | dev-vercel | apple-touch-icon | https://vercel.com/apple-touch-icon.png | 200 | image/png | 180×180 | loaded | 121 | — | browser | — |
| web | dev-vercel | apple-touch-icon-precomposed | https://vercel.com/apple-touch-icon-precomposed.png | 200 | image/png | 180×180 | loaded | 46 | — | browser | — |
| web | dev-vercel | favicon.svg | https://vercel.com/favicon.svg | 404 | text/markdown; charset=utf-8 | 0×0 | failed | 46 | — | browser | image-decode-or-policy-error-http-404 |
| web | dev-vercel | favicon-32x32.png | https://vercel.com/favicon-32x32.png | 404 | text/markdown; charset=utf-8 | 0×0 | failed | 31 | — | browser | image-decode-or-policy-error-http-404 |
| web | dev-vercel | favicon.ico | https://vercel.com/favicon.ico | 200 | image/vnd.microsoft.icon | 48×48 | loaded | 41 | — | unauthenticated-http-probe | — |
| web | news-nytimes | apple-touch-icon | https://www.nytimes.com/apple-touch-icon.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 400 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | news-nytimes | apple-touch-icon-precomposed | https://www.nytimes.com/apple-touch-icon-precomposed.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 371 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | news-nytimes | favicon.svg | https://www.nytimes.com/favicon.svg | 404 | text/html; charset=UTF-8 | 0×0 | failed | 58 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | news-nytimes | favicon-32x32.png | https://www.nytimes.com/favicon-32x32.png | 404 | text/html; charset=UTF-8 | 0×0 | failed | 31 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | news-nytimes | favicon.ico | https://www.nytimes.com/favicon.ico | 200 | image/x-icon | 48×48 | loaded | 14 | — | unauthenticated-http-probe | — |
| web | news-bbc | apple-touch-icon | https://www.bbc.com/apple-touch-icon.png | 200 | image/png | 57×57 | loaded | 44 | — | browser | — |
| web | news-bbc | apple-touch-icon-precomposed | https://www.bbc.com/apple-touch-icon-precomposed.png | 200 | image/png | 57×57 | loaded | 14 | — | browser | — |
| web | news-bbc | favicon.svg | https://www.bbc.com/favicon.svg | 404 | text/html; charset=utf-8 | 0×0 | failed | 20 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | news-bbc | favicon-32x32.png | https://www.bbc.com/favicon-32x32.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 8 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | news-bbc | favicon.ico | https://www.bbc.com/favicon.ico | 200 | image/vnd.microsoft.icon | 48×48 | loaded | 14 | — | unauthenticated-http-probe | — |
| web | news-cnn | apple-touch-icon | https://www.cnn.com/apple-touch-icon.png | 404 | text/plain; charset=utf-8 | 0×0 | failed | 45 | — | browser | image-decode-or-policy-error-http-404 |
| web | news-cnn | apple-touch-icon-precomposed | https://www.cnn.com/apple-touch-icon-precomposed.png | 404 | text/plain; charset=utf-8 | 0×0 | failed | 29 | — | browser | image-decode-or-policy-error-http-404 |
| web | news-cnn | favicon.svg | https://www.cnn.com/favicon.svg | 200 | text/html | 0×0 | failed | 19 | — | browser | image-decode-or-policy-error-http-200 |
| web | news-cnn | favicon-32x32.png | https://www.cnn.com/favicon-32x32.png | 200 | text/html | 0×0 | failed | 10 | — | browser | image-decode-or-policy-error-http-200 |
| web | news-cnn | favicon.ico | https://www.cnn.com/favicon.ico | 200 | image/x-icon | 0×0 | failed | 15 | — | unauthenticated-http-probe | image-decode-or-policy-error-http-200 |
| web | news-guardian | apple-touch-icon | https://www.theguardian.com/apple-touch-icon.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 36 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | news-guardian | apple-touch-icon-precomposed | https://www.theguardian.com/apple-touch-icon-precomposed.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 26 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | news-guardian | favicon.svg | https://www.theguardian.com/favicon.svg | 404 | text/html; charset=UTF-8 | 0×0 | failed | 170 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | news-guardian | favicon-32x32.png | https://www.theguardian.com/favicon-32x32.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 25 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | news-guardian | favicon.ico | https://www.theguardian.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 74 | — | unauthenticated-http-probe | — |
| web | office-notion | apple-touch-icon | https://www.notion.so/apple-touch-icon.png | 403 | text/html; charset=UTF-8 | 0×0 | failed | 134 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | office-notion | apple-touch-icon-precomposed | https://www.notion.so/apple-touch-icon-precomposed.png | 403 | text/html; charset=UTF-8 | 0×0 | failed | 48 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | office-notion | favicon.svg | https://www.notion.so/favicon.svg | 403 | text/html; charset=UTF-8 | 0×0 | failed | 33 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | office-notion | favicon-32x32.png | https://www.notion.so/favicon-32x32.png | 403 | text/html; charset=UTF-8 | 0×0 | failed | 30 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | office-notion | favicon.ico | https://www.notion.so/favicon.ico | 403 | text/html; charset=UTF-8 | 0×0 | failed | 22 | — | unauthenticated-http-probe | image-decode-or-policy-error-http-403 |
| web | office-google-docs | apple-touch-icon | https://docs.google.com/apple-touch-icon.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 50 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | office-google-docs | apple-touch-icon-precomposed | https://docs.google.com/apple-touch-icon-precomposed.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 59 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | office-google-docs | favicon.svg | https://docs.google.com/favicon.svg | 404 | text/html; charset=utf-8 | 0×0 | failed | 45 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | office-google-docs | favicon-32x32.png | https://docs.google.com/favicon-32x32.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 41 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | office-google-docs | favicon.ico | https://docs.google.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 93 | cross-origin | unauthenticated-http-probe | — |
| web | office-microsoft | apple-touch-icon | https://www.office.com/apple-touch-icon.png | 302 | text/html; charset=utf-8 | 0×0 | failed | 439 | — | browser | net::ERR_BLOCKED_BY_ORB |
| web | office-microsoft | apple-touch-icon-precomposed | https://www.office.com/apple-touch-icon-precomposed.png | 302 | text/html; charset=utf-8 | 0×0 | failed | 347 | — | browser | net::ERR_BLOCKED_BY_ORB |
| web | office-microsoft | favicon.svg | https://www.office.com/favicon.svg | 302 | text/html; charset=utf-8 | 0×0 | failed | 343 | — | browser | net::ERR_BLOCKED_BY_ORB |
| web | office-microsoft | favicon-32x32.png | https://www.office.com/favicon-32x32.png | 302 | text/html; charset=utf-8 | 0×0 | failed | 346 | — | browser | net::ERR_BLOCKED_BY_ORB |
| web | office-microsoft | favicon.ico | https://www.office.com/favicon.ico | 200 | text/html; charset=utf-8 | 0×0 | failed | 339 | — | unauthenticated-http-probe | image-decode-or-policy-error-http-200 |
| web | cloud-google-drive | apple-touch-icon | https://drive.google.com/apple-touch-icon.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 80 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | cloud-google-drive | apple-touch-icon-precomposed | https://drive.google.com/apple-touch-icon-precomposed.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 53 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | cloud-google-drive | favicon.svg | https://drive.google.com/favicon.svg | 404 | text/html; charset=utf-8 | 0×0 | failed | 49 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | cloud-google-drive | favicon-32x32.png | https://drive.google.com/favicon-32x32.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 45 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | cloud-google-drive | favicon.ico | https://drive.google.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 34 | cross-origin | unauthenticated-http-probe | — |
| web | cloud-dropbox | apple-touch-icon | https://www.dropbox.com/apple-touch-icon.png | 404 | text/html | 0×0 | failed | 37 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | cloud-dropbox | apple-touch-icon-precomposed | https://www.dropbox.com/apple-touch-icon-precomposed.png | 404 | text/html | 0×0 | failed | 26 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | cloud-dropbox | favicon.svg | https://www.dropbox.com/favicon.svg | 404 | text/html | 0×0 | failed | 23 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | cloud-dropbox | favicon-32x32.png | https://www.dropbox.com/favicon-32x32.png | 404 | text/html | 0×0 | failed | 20 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | cloud-dropbox | favicon.ico | https://www.dropbox.com/favicon.ico | 404 | text/html | 0×0 | failed | 20 | — | unauthenticated-http-probe | image-decode-or-policy-error-http-404 |
| web | cloud-onedrive | apple-touch-icon | https://onedrive.live.com/apple-touch-icon.png | 403 | — | 0×0 | failed | 95 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | cloud-onedrive | apple-touch-icon-precomposed | https://onedrive.live.com/apple-touch-icon-precomposed.png | 403 | — | 0×0 | failed | 51 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | cloud-onedrive | favicon.svg | https://onedrive.live.com/favicon.svg | 403 | — | 0×0 | failed | 35 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | cloud-onedrive | favicon-32x32.png | https://onedrive.live.com/favicon-32x32.png | 403 | — | 0×0 | failed | 36 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | cloud-onedrive | favicon.ico | https://onedrive.live.com/favicon.ico | 403 | — | 32×32 | loaded | 37 | — | unauthenticated-http-probe | — |
| web | music-spotify | apple-touch-icon | https://open.spotify.com/apple-touch-icon.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 104 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | music-spotify | apple-touch-icon-precomposed | https://open.spotify.com/apple-touch-icon-precomposed.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 90 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | music-spotify | favicon.svg | https://open.spotify.com/favicon.svg | 404 | text/html; charset=utf-8 | 0×0 | failed | 95 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | music-spotify | favicon-32x32.png | https://open.spotify.com/favicon-32x32.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 83 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | music-spotify | favicon.ico | https://open.spotify.com/favicon.ico | 200 | image/vnd.microsoft.icon | 48×48 | loaded | 195 | — | unauthenticated-http-probe | — |
| web | music-soundcloud | apple-touch-icon | https://soundcloud.com/apple-touch-icon.png | 404 | — | 0×0 | failed | 165 | — | browser | image-decode-or-policy-error-http-404 |
| web | music-soundcloud | apple-touch-icon-precomposed | https://soundcloud.com/apple-touch-icon-precomposed.png | 404 | — | 0×0 | failed | 140 | — | browser | image-decode-or-policy-error-http-404 |
| web | music-soundcloud | favicon.svg | https://soundcloud.com/favicon.svg | 404 | — | 0×0 | failed | 132 | — | browser | image-decode-or-policy-error-http-404 |
| web | music-soundcloud | favicon-32x32.png | https://soundcloud.com/favicon-32x32.png | 404 | — | 0×0 | failed | 309 | — | browser | image-decode-or-policy-error-http-404 |
| web | music-soundcloud | favicon.ico | https://soundcloud.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 319 | — | unauthenticated-http-probe | — |
| web | music-bandcamp | apple-touch-icon | https://bandcamp.com/apple-touch-icon.png | 404 | text/html; charset=UTF-8 | 0×0 | failed | 128 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | music-bandcamp | apple-touch-icon-precomposed | https://bandcamp.com/apple-touch-icon-precomposed.png | 404 | text/html; charset=UTF-8 | 0×0 | failed | 121 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | music-bandcamp | favicon.svg | https://bandcamp.com/favicon.svg | 404 | text/html; charset=UTF-8 | 0×0 | failed | 128 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | music-bandcamp | favicon-32x32.png | https://bandcamp.com/favicon-32x32.png | 404 | text/html; charset=UTF-8 | 0×0 | failed | 298 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | music-bandcamp | favicon.ico | https://bandcamp.com/favicon.ico | 404 | — | 0×0 | failed | 91 | — | unauthenticated-http-probe | image-decode-or-policy-error-http-404 |
| web | education-coursera | apple-touch-icon | https://www.coursera.org/apple-touch-icon.png | 404 | text/html | 0×0 | failed | 448 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | education-coursera | apple-touch-icon-precomposed | https://www.coursera.org/apple-touch-icon-precomposed.png | 404 | text/html | 0×0 | failed | 227 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | education-coursera | favicon.svg | https://www.coursera.org/favicon.svg | 404 | text/html | 0×0 | failed | 221 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | education-coursera | favicon-32x32.png | https://www.coursera.org/favicon-32x32.png | 404 | text/html | 0×0 | failed | 225 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | education-coursera | favicon.ico | https://www.coursera.org/favicon.ico | 200 | image/x-icon | 48×48 | loaded | 248 | — | unauthenticated-http-probe | — |
| web | education-khan | apple-touch-icon | https://www.khanacademy.org/apple-touch-icon.png | 200 | text/html; charset=utf-8 | 0×0 | failed | 38 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | education-khan | apple-touch-icon-precomposed | https://www.khanacademy.org/apple-touch-icon-precomposed.png | 200 | text/html; charset=utf-8 | 0×0 | failed | 21 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | education-khan | favicon.svg | https://www.khanacademy.org/favicon.svg | 200 | text/html; charset=utf-8 | 0×0 | failed | 18 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | education-khan | favicon-32x32.png | https://www.khanacademy.org/favicon-32x32.png | 200 | text/html; charset=utf-8 | 0×0 | failed | 25 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | education-khan | favicon.ico | https://www.khanacademy.org/favicon.ico | 200 | image/vnd.microsoft.icon | 32×32 | loaded | 30 | — | unauthenticated-http-probe | — |
| web | education-arxiv | apple-touch-icon | https://arxiv.org/apple-touch-icon.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 22 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | education-arxiv | apple-touch-icon-precomposed | https://arxiv.org/apple-touch-icon-precomposed.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 15 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | education-arxiv | favicon.svg | https://arxiv.org/favicon.svg | 404 | text/html; charset=utf-8 | 0×0 | failed | 333 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | education-arxiv | favicon-32x32.png | https://arxiv.org/favicon-32x32.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 337 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | education-arxiv | favicon.ico | https://arxiv.org/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 10 | — | unauthenticated-http-probe | — |
| web | travel-airbnb | apple-touch-icon | https://www.airbnb.com/apple-touch-icon.png | 301 | text/html;charset=utf-8 | 0×0 | failed | 1285 | — | browser | net::ERR_BLOCKED_BY_ORB |
| web | travel-airbnb | apple-touch-icon-precomposed | https://www.airbnb.com/apple-touch-icon-precomposed.png | 200 | image/png | 58×58 | loaded | 520 | — | browser | — |
| web | travel-airbnb | favicon.svg | https://www.airbnb.com/favicon.svg | 301 | text/html;charset=utf-8 | 0×0 | failed | 1616 | — | browser | net::ERR_BLOCKED_BY_ORB |
| web | travel-airbnb | favicon-32x32.png | https://www.airbnb.com/favicon-32x32.png | 301 | text/html;charset=utf-8 | 0×0 | failed | 1084 | — | browser | net::ERR_BLOCKED_BY_ORB |
| web | travel-airbnb | favicon.ico | https://www.airbnb.com/favicon.ico | 200 | image/vnd.microsoft.icon | 32×32 | loaded | 313 | — | unauthenticated-http-probe | — |
| web | travel-booking | apple-touch-icon | https://www.booking.com/apple-touch-icon.png | 200 | image/png | 180×180 | loaded | 487 | — | browser | — |
| web | travel-booking | apple-touch-icon-precomposed | https://www.booking.com/apple-touch-icon-precomposed.png | 200 | image/png | 180×180 | loaded | 202 | — | browser | — |
| web | travel-booking | favicon.svg | https://www.booking.com/favicon.svg | 404 | text/html; charset=UTF-8 | 0×0 | failed | 481 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | travel-booking | favicon-32x32.png | https://www.booking.com/favicon-32x32.png | 404 | text/html; charset=UTF-8 | 0×0 | failed | 462 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | travel-booking | favicon.ico | https://www.booking.com/favicon.ico | 404 | text/html | 0×0 | failed | 171 | — | unauthenticated-http-probe | image-decode-or-policy-error-http-404 |
| web | travel-tripadvisor | apple-touch-icon | https://www.tripadvisor.com/apple-touch-icon.png | 200 | image/png | 180×180 | loaded | 61 | — | browser | — |
| web | travel-tripadvisor | apple-touch-icon-precomposed | https://www.tripadvisor.com/apple-touch-icon-precomposed.png | 200 | image/png | 180×180 | loaded | 23 | — | browser | — |
| web | travel-tripadvisor | favicon.svg | https://www.tripadvisor.com/favicon.svg | 404 | text/html;charset=UTF-8 | 0×0 | failed | 121 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | travel-tripadvisor | favicon-32x32.png | https://www.tripadvisor.com/favicon-32x32.png | 404 | text/html;charset=UTF-8 | 0×0 | failed | 145 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | travel-tripadvisor | favicon.ico | https://www.tripadvisor.com/favicon.ico | 200 | image/x-icon | 48×48 | loaded | 22 | — | unauthenticated-http-probe | — |
| web | finance-paypal | apple-touch-icon | https://www.paypal.com/apple-touch-icon.png | 301 | text/html; charset=iso-8859-1 | 0×0 | failed | 289 | — | browser | net::ERR_BLOCKED_BY_ORB |
| web | finance-paypal | apple-touch-icon-precomposed | https://www.paypal.com/apple-touch-icon-precomposed.png | 301 | text/html; charset=iso-8859-1 | 0×0 | failed | 227 | — | browser | net::ERR_BLOCKED_BY_ORB |
| web | finance-paypal | favicon.svg | https://www.paypal.com/favicon.svg | 301 | text/html; charset=iso-8859-1 | 0×0 | failed | 272 | — | browser | net::ERR_BLOCKED_BY_ORB |
| web | finance-paypal | favicon-32x32.png | https://www.paypal.com/favicon-32x32.png | 301 | text/html; charset=iso-8859-1 | 0×0 | failed | 268 | — | browser | net::ERR_BLOCKED_BY_ORB |
| web | finance-paypal | favicon.ico | https://www.paypal.com/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 25 | — | unauthenticated-http-probe | — |
| web | finance-stripe | apple-touch-icon | https://stripe.com/apple-touch-icon.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 286 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | finance-stripe | apple-touch-icon-precomposed | https://stripe.com/apple-touch-icon-precomposed.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 134 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | finance-stripe | favicon.svg | https://stripe.com/favicon.svg | 404 | text/html; charset=utf-8 | 0×0 | failed | 139 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | finance-stripe | favicon-32x32.png | https://stripe.com/favicon-32x32.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 138 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | finance-stripe | favicon.ico | https://stripe.com/favicon.ico | 200 | image/vnd.microsoft.icon; charset=utf-8 | 48×48 | loaded | 126 | — | unauthenticated-http-probe | — |
| web | finance-coinbase | apple-touch-icon | https://www.coinbase.com/apple-touch-icon.png | 200 | image/png | 512×512 | loaded | 28 | — | browser | — |
| web | finance-coinbase | apple-touch-icon-precomposed | https://www.coinbase.com/apple-touch-icon-precomposed.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 68 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | finance-coinbase | favicon.svg | https://www.coinbase.com/favicon.svg | 404 | text/html; charset=utf-8 | 0×0 | failed | 66 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | finance-coinbase | favicon-32x32.png | https://www.coinbase.com/favicon-32x32.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 71 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | finance-coinbase | favicon.ico | https://www.coinbase.com/favicon.ico | 200 | image/vnd.microsoft.icon | 32×32 | loaded | 22 | — | unauthenticated-http-probe | — |
| web | messaging-whatsapp | apple-touch-icon | https://www.whatsapp.com/apple-touch-icon.png | 200 | image/png | 0×0 | failed | 70 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| web | messaging-whatsapp | apple-touch-icon-precomposed | https://www.whatsapp.com/apple-touch-icon-precomposed.png | 200 | image/png | 0×0 | failed | 49 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| web | messaging-whatsapp | favicon.svg | https://www.whatsapp.com/favicon.svg | 404 | text/html; charset="utf-8" | 0×0 | failed | 26 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| web | messaging-whatsapp | favicon-32x32.png | https://www.whatsapp.com/favicon-32x32.png | 404 | text/html; charset="utf-8" | 0×0 | failed | 25 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| web | messaging-whatsapp | favicon.ico | https://www.whatsapp.com/favicon.ico | 200 | image/png | 0×0 | failed | 30 | same-origin | unauthenticated-http-probe | blocked-by-corp-same-origin |
| web | messaging-telegram | apple-touch-icon | https://telegram.org/apple-touch-icon.png | 200 | text/html; charset=utf-8 | 0×0 | failed | 289 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | messaging-telegram | apple-touch-icon-precomposed | https://telegram.org/apple-touch-icon-precomposed.png | 200 | text/html; charset=utf-8 | 0×0 | failed | 107 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | messaging-telegram | favicon.svg | https://telegram.org/favicon.svg | 200 | text/html; charset=utf-8 | 0×0 | failed | 112 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | messaging-telegram | favicon-32x32.png | https://telegram.org/favicon-32x32.png | 200 | text/html; charset=utf-8 | 0×0 | failed | 116 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | messaging-telegram | favicon.ico | https://telegram.org/favicon.ico | 200 | image/x-icon | 32×32 | loaded | 98 | — | unauthenticated-http-probe | — |
| web | messaging-discord | apple-touch-icon | https://discord.com/apple-touch-icon.png | 404 | text/html | 0×0 | failed | 192 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | messaging-discord | apple-touch-icon-precomposed | https://discord.com/apple-touch-icon-precomposed.png | 404 | text/html | 0×0 | failed | 122 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | messaging-discord | favicon.svg | https://discord.com/favicon.svg | 404 | text/html | 0×0 | failed | 126 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | messaging-discord | favicon-32x32.png | https://discord.com/favicon-32x32.png | 404 | text/html | 0×0 | failed | 134 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | messaging-discord | favicon.ico | https://discord.com/favicon.ico | 404 | text/html | 0×0 | failed | 139 | — | unauthenticated-http-probe | image-decode-or-policy-error-http-404 |
| web | productivity-trello | apple-touch-icon | https://trello.com/apple-touch-icon.png | 200 | text/html; charset=utf-8 | 0×0 | failed | 396 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | productivity-trello | apple-touch-icon-precomposed | https://trello.com/apple-touch-icon-precomposed.png | 200 | text/html; charset=utf-8 | 0×0 | failed | 190 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | productivity-trello | favicon.svg | https://trello.com/favicon.svg | 200 | text/html; charset=utf-8 | 0×0 | failed | 182 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | productivity-trello | favicon-32x32.png | https://trello.com/favicon-32x32.png | 200 | text/html; charset=utf-8 | 0×0 | failed | 205 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | productivity-trello | favicon.ico | https://trello.com/favicon.ico | 200 | image/vnd.microsoft.icon | 256×256 | loaded | 243 | — | unauthenticated-http-probe | — |
| web | productivity-asana | apple-touch-icon | https://asana.com/apple-touch-icon.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 140 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | productivity-asana | apple-touch-icon-precomposed | https://asana.com/apple-touch-icon-precomposed.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 128 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | productivity-asana | favicon.svg | https://asana.com/favicon.svg | 404 | text/html; charset=utf-8 | 0×0 | failed | 211 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | productivity-asana | favicon-32x32.png | https://asana.com/favicon-32x32.png | 404 | text/html; charset=utf-8 | 0×0 | failed | 96 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | productivity-asana | favicon.ico | https://asana.com/favicon.ico | 200 | image/vnd.microsoft.icon | 48×48 | loaded | 25 | — | unauthenticated-http-probe | — |
| web | productivity-linear | apple-touch-icon | https://linear.app/apple-touch-icon.png | 200 | text/html | 0×0 | failed | 72 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | productivity-linear | apple-touch-icon-precomposed | https://linear.app/apple-touch-icon-precomposed.png | 200 | text/html | 0×0 | failed | 39 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | productivity-linear | favicon.svg | https://linear.app/favicon.svg | 200 | text/html | 0×0 | failed | 20 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | productivity-linear | favicon-32x32.png | https://linear.app/favicon-32x32.png | 200 | text/html | 0×0 | failed | 23 | — | unauthenticated-http-probe | net::ERR_BLOCKED_BY_ORB |
| web | productivity-linear | favicon.ico | https://linear.app/favicon.ico | 200 | image/x-icon | 48×48 | loaded | 36 | — | unauthenticated-http-probe | — |

## Category rates

| Category | Found | Clear |
|---|---:|---:|
| ai | 11/14 (79%) | 5/14 (36%) |
| cloud-storage | 4/6 (67%) | 0/6 (0%) |
| developer-tools | 9/12 (75%) | 9/12 (75%) |
| ecommerce | 8/8 (100%) | 0/8 (0%) |
| education | 6/6 (100%) | 0/6 (0%) |
| encyclopedia | 2/2 (100%) | 2/2 (100%) |
| finance | 6/6 (100%) | 2/6 (33%) |
| mail | 6/10 (60%) | 0/10 (0%) |
| maps | 6/6 (100%) | 0/6 (0%) |
| messaging | 2/6 (33%) | 0/6 (0%) |
| music | 4/6 (67%) | 0/6 (0%) |
| news | 6/8 (75%) | 0/8 (0%) |
| office | 2/6 (33%) | 0/6 (0%) |
| productivity | 6/6 (100%) | 2/6 (33%) |
| search | 8/8 (100%) | 0/8 (0%) |
| social | 10/12 (83%) | 4/12 (33%) |
| travel | 6/6 (100%) | 4/6 (67%) |
| video | 8/8 (100%) | 2/8 (25%) |

## Source rates

| Source | Found | Clear |
|---|---:|---:|
| apple-touch-icon | 27/27 (100%) | 21/27 (78%) |
| apple-touch-icon-precomposed | 4/4 (100%) | 2/4 (50%) |
| favicon.ico | 75/75 (100%) | 3/75 (4%) |
| favicon.svg | 4/4 (100%) | 4/4 (100%) |
| text-fallback | 0/26 (0%) | 0/26 (0%) |

## Platform limitations

- firefox-build: Error: browserType.launch:  ╔══════════════════════════════════════════════════════╗ ║ Host system is missing dependencies to run browsers. ║ ║ Please install them with the following command:      ║ ║                                                      ║ ║     sudo npx playwright install-deps                 ║ ║                                                      ║ ║ Alternatively, use apt:                              ║ ║     sudo apt-get install libgtk-3-0t64\              ║ ║         libcairo-gobject2\                           ║ ║         libgdk-pixbuf-2.0-0                          ║ ║                                                      ║ ║ <3 Playwright Team                                   ║ ╚══════════════════════════════════════════════════════╝
