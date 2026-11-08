/**
 * Common sites a user is likely to save as a shortcut, used by the brand-coverage probe
 * (`scripts/probe-brand-coverage.mjs`) and the coverage regression spec.
 *
 * `expectSlug` is the simple-icons 16.36.0 slug for the brand, present only when the icon
 * exists in that catalogue. Sites without it are deliberate: the brand was removed from
 * simple-icons (trademark takedowns) or was never added, and the report must show them.
 */
export type SiteCategory =
  | 'Chinese'
  | 'Google'
  | 'Microsoft'
  | 'Apple'
  | 'Social'
  | 'Video/music'
  | 'Dev'
  | 'AI'
  | 'Shopping/finance'
  | 'Productivity'
  | 'News/reference'

export type CommonSite = {
  name: string
  url: string
  category: SiteCategory
  /** Exact simple-icons slug, when the catalogue has one. */
  expectSlug?: string
}

export const COMMON_SITES: CommonSite[] = [
  // Chinese sites
  { name: 'Bilibili', url: 'https://www.bilibili.com', category: 'Chinese', expectSlug: 'bilibili' },
  { name: 'WeChat', url: 'https://weixin.qq.com', category: 'Chinese', expectSlug: 'wechat' },
  { name: 'QQ', url: 'https://im.qq.com', category: 'Chinese', expectSlug: 'qq' },
  { name: 'Taobao', url: 'https://www.taobao.com', category: 'Chinese', expectSlug: 'taobao' },
  { name: 'Tmall', url: 'https://www.tmall.com', category: 'Chinese' },
  { name: 'JD', url: 'https://www.jd.com', category: 'Chinese' },
  { name: 'Zhihu', url: 'https://www.zhihu.com', category: 'Chinese', expectSlug: 'zhihu' },
  { name: 'Weibo', url: 'https://weibo.com', category: 'Chinese', expectSlug: 'sinaweibo' },
  { name: 'Baidu', url: 'https://www.baidu.com', category: 'Chinese', expectSlug: 'baidu' },
  { name: 'Douyin', url: 'https://www.douyin.com', category: 'Chinese' },
  { name: 'Xiaohongshu', url: 'https://www.xiaohongshu.com', category: 'Chinese', expectSlug: 'xiaohongshu' },
  { name: 'NetEase Cloud Music', url: 'https://music.163.com', category: 'Chinese', expectSlug: 'neteasecloudmusic' },
  { name: 'Douban', url: 'https://www.douban.com', category: 'Chinese', expectSlug: 'douban' },
  { name: 'Juejin', url: 'https://juejin.cn', category: 'Chinese', expectSlug: 'juejin' },
  { name: 'CSDN', url: 'https://www.csdn.net', category: 'Chinese', expectSlug: 'csdn' },
  { name: 'Alipay', url: 'https://www.alipay.com', category: 'Chinese', expectSlug: 'alipay' },
  { name: 'Gitee', url: 'https://gitee.com', category: 'Chinese', expectSlug: 'gitee' },
  { name: 'iQIYI', url: 'https://www.iqiyi.com', category: 'Chinese' },
  { name: 'Youku', url: 'https://www.youku.com', category: 'Chinese' },
  { name: 'Meituan', url: 'https://www.meituan.com', category: 'Chinese', expectSlug: 'meituan' },
  { name: 'Tencent', url: 'https://www.tencent.com', category: 'Chinese' },
  { name: 'NetEase Mail', url: 'https://mail.163.com', category: 'Chinese' },
  { name: 'Xiaomi', url: 'https://www.mi.com', category: 'Chinese', expectSlug: 'xiaomi' },
  { name: 'Huawei', url: 'https://www.huawei.com', category: 'Chinese', expectSlug: 'huawei' },
  { name: 'Ctrip', url: 'https://www.ctrip.com', category: 'Chinese' },
  { name: 'Pinduoduo', url: 'https://www.pinduoduo.com', category: 'Chinese' },
  { name: 'DingTalk', url: 'https://www.dingtalk.com', category: 'Chinese' },
  { name: 'Feishu', url: 'https://www.feishu.cn', category: 'Chinese' },
  { name: 'Xueqiu', url: 'https://xueqiu.com', category: 'Chinese' },
  { name: 'Eastmoney', url: 'https://www.eastmoney.com', category: 'Chinese' },

  // Google
  { name: 'Google Search', url: 'https://www.google.com', category: 'Google', expectSlug: 'google' },
  { name: 'Gmail', url: 'https://mail.google.com/mail/u/0/', category: 'Google', expectSlug: 'gmail' },
  { name: 'Google Drive', url: 'https://drive.google.com', category: 'Google', expectSlug: 'googledrive' },
  { name: 'Google Docs', url: 'https://docs.google.com/document/u/0/', category: 'Google', expectSlug: 'googledocs' },
  { name: 'Google Maps', url: 'https://www.google.com/maps', category: 'Google', expectSlug: 'googlemaps' },
  { name: 'YouTube', url: 'https://www.youtube.com', category: 'Google', expectSlug: 'youtube' },
  { name: 'Gemini', url: 'https://gemini.google.com', category: 'Google', expectSlug: 'googlegemini' },
  { name: 'Google Calendar', url: 'https://calendar.google.com', category: 'Google', expectSlug: 'googlecalendar' },
  { name: 'Google Photos', url: 'https://photos.google.com', category: 'Google', expectSlug: 'googlephotos' },
  { name: 'Google Translate', url: 'https://translate.google.com', category: 'Google', expectSlug: 'googletranslate' },

  // Microsoft
  { name: 'Outlook', url: 'https://outlook.live.com/mail/0/', category: 'Microsoft' },
  { name: 'Microsoft Office', url: 'https://www.office.com', category: 'Microsoft' },
  { name: 'Microsoft Teams', url: 'https://teams.microsoft.com', category: 'Microsoft' },
  { name: 'OneDrive', url: 'https://onedrive.live.com', category: 'Microsoft' },
  { name: 'Bing', url: 'https://www.bing.com', category: 'Microsoft' },
  { name: 'Microsoft Copilot', url: 'https://copilot.microsoft.com', category: 'Microsoft' },
  { name: 'LinkedIn', url: 'https://www.linkedin.com', category: 'Microsoft' },

  // Apple
  { name: 'Apple', url: 'https://www.apple.com', category: 'Apple', expectSlug: 'apple' },
  { name: 'iCloud', url: 'https://www.icloud.com', category: 'Apple', expectSlug: 'icloud' },
  { name: 'App Store', url: 'https://www.apple.com/app-store/', category: 'Apple', expectSlug: 'appstore' },
  { name: 'Apple TV', url: 'https://tv.apple.com', category: 'Apple', expectSlug: 'appletv' },
  { name: 'Apple Podcasts', url: 'https://podcasts.apple.com', category: 'Apple', expectSlug: 'applepodcasts' },

  // Social
  { name: 'X', url: 'https://x.com', category: 'Social', expectSlug: 'x' },
  { name: 'Facebook', url: 'https://www.facebook.com', category: 'Social', expectSlug: 'facebook' },
  { name: 'Instagram', url: 'https://www.instagram.com', category: 'Social', expectSlug: 'instagram' },
  { name: 'Reddit', url: 'https://www.reddit.com', category: 'Social', expectSlug: 'reddit' },
  { name: 'Discord', url: 'https://discord.com', category: 'Social', expectSlug: 'discord' },
  { name: 'Telegram', url: 'https://web.telegram.org', category: 'Social', expectSlug: 'telegram' },
  { name: 'WhatsApp', url: 'https://web.whatsapp.com', category: 'Social', expectSlug: 'whatsapp' },
  { name: 'TikTok', url: 'https://www.tiktok.com', category: 'Social', expectSlug: 'tiktok' },
  { name: 'Pinterest', url: 'https://www.pinterest.com', category: 'Social', expectSlug: 'pinterest' },
  { name: 'Threads', url: 'https://www.threads.net', category: 'Social', expectSlug: 'threads' },

  // Video and music
  { name: 'Netflix', url: 'https://www.netflix.com', category: 'Video/music', expectSlug: 'netflix' },
  { name: 'Twitch', url: 'https://www.twitch.tv', category: 'Video/music', expectSlug: 'twitch' },
  { name: 'Spotify', url: 'https://open.spotify.com', category: 'Video/music', expectSlug: 'spotify' },
  { name: 'Apple Music', url: 'https://music.apple.com', category: 'Video/music', expectSlug: 'applemusic' },
  { name: 'Disney+', url: 'https://www.disneyplus.com', category: 'Video/music' },

  // Dev
  { name: 'GitHub', url: 'https://github.com', category: 'Dev', expectSlug: 'github' },
  { name: 'GitLab', url: 'https://gitlab.com', category: 'Dev', expectSlug: 'gitlab' },
  { name: 'Stack Overflow', url: 'https://stackoverflow.com', category: 'Dev', expectSlug: 'stackoverflow' },
  { name: 'npm', url: 'https://www.npmjs.com', category: 'Dev', expectSlug: 'npm' },
  { name: 'MDN', url: 'https://developer.mozilla.org', category: 'Dev', expectSlug: 'mdnwebdocs' },
  { name: 'Vercel', url: 'https://vercel.com', category: 'Dev', expectSlug: 'vercel' },
  { name: 'Bitbucket', url: 'https://bitbucket.org', category: 'Dev', expectSlug: 'bitbucket' },
  { name: 'CodePen', url: 'https://codepen.io', category: 'Dev' },

  // AI
  { name: 'ChatGPT', url: 'https://chatgpt.com', category: 'AI' },
  { name: 'Claude', url: 'https://claude.ai', category: 'AI', expectSlug: 'claude' },
  { name: 'Perplexity', url: 'https://www.perplexity.ai', category: 'AI', expectSlug: 'perplexity' },
  { name: 'DeepSeek', url: 'https://chat.deepseek.com', category: 'AI', expectSlug: 'deepseek' },
  { name: 'Kimi', url: 'https://kimi.moonshot.cn', category: 'AI', expectSlug: 'kimi' },
  { name: 'Doubao', url: 'https://www.doubao.com', category: 'AI' },
  { name: 'Tongyi', url: 'https://tongyi.aliyun.com', category: 'AI' },
  { name: 'Hugging Face', url: 'https://huggingface.co', category: 'AI', expectSlug: 'huggingface' },

  // Shopping and finance
  { name: 'Amazon', url: 'https://www.amazon.com', category: 'Shopping/finance' },
  { name: 'eBay', url: 'https://www.ebay.com', category: 'Shopping/finance', expectSlug: 'ebay' },
  { name: 'AliExpress', url: 'https://www.aliexpress.com', category: 'Shopping/finance', expectSlug: 'aliexpress' },
  { name: 'PayPal', url: 'https://www.paypal.com', category: 'Shopping/finance', expectSlug: 'paypal' },
  { name: 'Stripe', url: 'https://stripe.com', category: 'Shopping/finance', expectSlug: 'stripe' },
  { name: 'Wise', url: 'https://wise.com', category: 'Shopping/finance', expectSlug: 'wise' },
  { name: 'Revolut', url: 'https://www.revolut.com', category: 'Shopping/finance', expectSlug: 'revolut' },
  { name: 'Binance', url: 'https://www.binance.com', category: 'Shopping/finance', expectSlug: 'binance' },
  { name: 'Coinbase', url: 'https://www.coinbase.com', category: 'Shopping/finance', expectSlug: 'coinbase' },
  { name: 'TradingView', url: 'https://www.tradingview.com', category: 'Shopping/finance', expectSlug: 'tradingview' },

  // Productivity
  { name: 'Notion', url: 'https://www.notion.so', category: 'Productivity', expectSlug: 'notion' },
  { name: 'Figma', url: 'https://www.figma.com', category: 'Productivity', expectSlug: 'figma' },
  { name: 'Slack', url: 'https://app.slack.com', category: 'Productivity' },
  { name: 'Trello', url: 'https://trello.com', category: 'Productivity', expectSlug: 'trello' },
  { name: 'Dropbox', url: 'https://www.dropbox.com', category: 'Productivity', expectSlug: 'dropbox' },
  { name: 'Zoom', url: 'https://zoom.us', category: 'Productivity', expectSlug: 'zoom' },
  { name: 'Canva', url: 'https://www.canva.com', category: 'Productivity' },

  // News and reference
  { name: 'Wikipedia', url: 'https://www.wikipedia.org', category: 'News/reference', expectSlug: 'wikipedia' },
  { name: 'Medium', url: 'https://medium.com', category: 'News/reference', expectSlug: 'medium' },
  { name: 'Quora', url: 'https://www.quora.com', category: 'News/reference', expectSlug: 'quora' },

  // Everyday services
  { name: 'Yahoo', url: 'https://www.yahoo.com', category: 'News/reference' },
  { name: 'DuckDuckGo', url: 'https://duckduckgo.com', category: 'News/reference', expectSlug: 'duckduckgo' },
  { name: 'Proton Mail', url: 'https://mail.proton.me', category: 'Productivity', expectSlug: 'protonmail' },
  { name: 'Evernote', url: 'https://www.evernote.com', category: 'Productivity', expectSlug: 'evernote' },
  { name: 'Todoist', url: 'https://todoist.com', category: 'Productivity', expectSlug: 'todoist' },
  { name: 'Asana', url: 'https://app.asana.com', category: 'Productivity', expectSlug: 'asana' },
  { name: 'Jira', url: 'https://www.atlassian.com/software/jira', category: 'Dev', expectSlug: 'jira' },
  { name: 'Linear', url: 'https://linear.app', category: 'Dev', expectSlug: 'linear' },
  { name: 'Dribbble', url: 'https://dribbble.com', category: 'Social', expectSlug: 'dribbble' },
  { name: 'Behance', url: 'https://www.behance.net', category: 'Social', expectSlug: 'behance' },
  { name: 'IMDb', url: 'https://www.imdb.com', category: 'Video/music', expectSlug: 'imdb' },
  { name: 'SoundCloud', url: 'https://soundcloud.com', category: 'Video/music', expectSlug: 'soundcloud' },
  { name: 'Deezer', url: 'https://www.deezer.com', category: 'Video/music', expectSlug: 'deezer' },
  { name: 'Steam', url: 'https://store.steampowered.com', category: 'Video/music', expectSlug: 'steam' },
  { name: 'Epic Games', url: 'https://store.epicgames.com', category: 'Video/music', expectSlug: 'epicgames' },
  { name: 'PlayStation', url: 'https://www.playstation.com', category: 'Video/music', expectSlug: 'playstation' },
  { name: 'Duolingo', url: 'https://www.duolingo.com', category: 'Productivity', expectSlug: 'duolingo' },
  { name: 'Coursera', url: 'https://www.coursera.org', category: 'Productivity', expectSlug: 'coursera' },
  { name: 'Khan Academy', url: 'https://www.khanacademy.org', category: 'Productivity', expectSlug: 'khanacademy' },
  { name: 'Airbnb', url: 'https://www.airbnb.com', category: 'Shopping/finance', expectSlug: 'airbnb' },
  { name: 'Booking.com', url: 'https://www.booking.com', category: 'Shopping/finance', expectSlug: 'bookingdotcom' },
  { name: 'Uber', url: 'https://www.uber.com', category: 'Shopping/finance', expectSlug: 'uber' },
]

/** Launch order is the list order; ids keep the DOM mapping stable. */
export function siteId(index: number) {
  return `site-${String(index).padStart(3, '0')}`
}
