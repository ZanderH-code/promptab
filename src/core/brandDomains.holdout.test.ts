import * as simpleIcons from 'simple-icons'
import { describe, expect, it } from 'vitest'
import { buildBrandIndex } from '../../scripts/build-brand-index.mjs'
import { COMMON_SITES } from '../../e2e/fixtures/common-sites'
import overrides from './brandDomains.json'
import { brandSlugFor } from './brandDomains'

// Hold-out list supplied with the B1b ticket: 70 sites outside `common-sites.ts`.
const HOLDOUT: Array<[string, string | null]> = [
  ['https://store.steampowered.com', 'steam'],
  ['https://www.imdb.com', 'imdb'],
  ['https://www.booking.com', 'bookingdotcom'],
  ['https://www.airbnb.com', 'airbnb'],
  ['https://www.uber.com', 'uber'],
  ['https://www.shopify.com', 'shopify'],
  ['https://wordpress.com', 'wordpress'],
  ['https://www.tumblr.com', 'tumblr'],
  ['https://vimeo.com', 'vimeo'],
  ['https://soundcloud.com', 'soundcloud'],
  ['https://www.duolingo.com', 'duolingo'],
  ['https://www.coursera.org', 'coursera'],
  ['https://www.udemy.com', 'udemy'],
  ['https://www.khanacademy.org', 'khanacademy'],
  ['https://www.nytimes.com', 'newyorktimes'],
  ['https://www.bbc.co.uk', 'bbc'],
  ['https://www.theguardian.com', 'theguardian'],
  ['https://www.espn.com', 'espn'],
  ['https://mastodon.social', 'mastodon'],
  ['https://signal.org', 'signal'],
  ['https://line.me', 'line'],
  ['https://www.naver.com', 'naver'],
  // Yandex has no simple-icons mark: it must keep its favicon.
  ['https://yandex.ru', null],
  ['https://vk.com', 'vk'],
  ['https://www.alibaba.com', 'alibabadotcom'],
  ['https://www.aliyun.com', 'alibabacloud'],
  ['https://www.mi.com', 'xiaomi'],
  ['https://www.huawei.com', 'huawei'],
  ['https://www.jianshu.com', 'jianshu'],
  ['https://www.v2ex.com', 'v2ex'],
  ['https://zhuanlan.zhihu.com', 'zhihu'],
  ['https://space.bilibili.com/1', 'bilibili'],
  ['https://docs.github.com', 'github'],
  ['https://gist.github.com', 'github'],
  ['https://www.cloudflare.com', 'cloudflare'],
  ['https://www.digitalocean.com', 'digitalocean'],
  ['https://www.heroku.com', 'heroku'],
  ['https://www.netlify.com', 'netlify'],
  ['https://supabase.com', 'supabase'],
  ['https://hub.docker.com', 'docker'],
  ['https://www.python.org', 'python'],
  ['https://www.rust-lang.org', 'rust'],
  ['https://nodejs.org', 'nodedotjs'],
  ['https://react.dev', 'react'],
  ['https://www.typescriptlang.org', 'typescript'],
  ['https://leetcode.com', 'leetcode'],
  ['https://leetcode.cn', 'leetcode'],
  ['https://codeforces.com', 'codeforces'],
  ['https://www.kaggle.com', 'kaggle'],
  ['https://arxiv.org', 'arxiv'],
  ['https://mistral.ai', 'mistralai'],
  ['https://ollama.com', 'ollama'],
  ['https://replicate.com', 'replicate'],
  ['https://www.deepl.com', 'deepl'],
  ['https://www.grammarly.com', 'grammarly'],
  ['https://evernote.com', 'evernote'],
  ['https://todoist.com', 'todoist'],
  ['https://obsidian.md', 'obsidian'],
  ['https://1password.com', '1password'],
  ['https://bitwarden.com', 'bitwarden'],
  ['https://proton.me', 'proton'],
  ['https://www.fastmail.com', 'fastmail'],
  ['https://www.douyu.com', 'douyu'],
  ['https://www.huya.com', 'huya'],
  ['https://www.ximalaya.com', 'ximalaya'],
  ['https://www.kuaishou.com', 'kuaishou'],
  ['https://y.qq.com', 'qqmusic'],
  ['https://www.meituan.com', 'meituan'],
  ['https://www.ele.me', 'eleme'],
  ['https://www.12306.cn', 'chinarailway'],
]

/** Documented acceptable product/parent pair: proton.me is bundled as Proton Mail. */
const ACCEPTABLE: Record<string, string> = { 'https://proton.me': 'protonmail' }

const index = buildBrandIndex(simpleIcons, overrides)
const slugs = new Set(Object.values(simpleIcons).map(icon => icon?.slug).filter(Boolean))
const inSimpleIcons = HOLDOUT.filter(([, expected]) => !!expected && slugs.has(expected))

describe('hold-out coverage', () => {
  it('has 59 of the 70 sites expecting a simple-icons mark', () => {
    expect(inSimpleIcons).toHaveLength(59)
  })

  it('resolves at least 58 of the 59 correctly', () => {
    const correct = inSimpleIcons.filter(([url, expected]) => brandSlugFor(index, url) === expected)
    expect(correct.length).toBeGreaterThanOrEqual(58)
  })

  it('has no wrong matches apart from documented product/parent pairs', () => {
    const wrong = inSimpleIcons
      .map(([url, expected]) => [url, brandSlugFor(index, url), expected] as const)
      .filter(([url, actual, expected]) => actual !== null && actual !== expected && ACCEPTABLE[url] !== actual)
    expect(wrong).toEqual([])
  })

  it('keeps the documented proton.me pair', () => {
    expect(brandSlugFor(index, 'https://proton.me')).toBe('protonmail')
  })

  it('leaves Yandex on its favicon', () => {
    expect(brandSlugFor(index, 'https://yandex.ru')).toBeNull()
  })
})

describe('common-sites after the label rules', () => {
  it('still resolves every expectSlug', () => {
    for (const site of COMMON_SITES.filter(entry => entry.expectSlug)) {
      expect(brandSlugFor(index, site.url), site.name).toBe(site.expectSlug)
    }
  })

  it('still resolves none of the brands simple-icons lacks', () => {
    for (const site of COMMON_SITES.filter(entry => !entry.expectSlug)) {
      expect(brandSlugFor(index, site.url), site.name).toBeNull()
    }
  })
})

describe('label rules stay exact', () => {
  it('handles generic-word domains', () => {
    expect(brandSlugFor(index, 'https://box.com')).toBe('box')
    expect(brandSlugFor(index, 'https://line.me')).toBe('line')
    expect(brandSlugFor(index, 'https://apple.com')).toBe('apple')
    expect(brandSlugFor(index, 'https://notion.so')).toBe('notion')
  })

  it('never resolves user pages of shared hosts', () => {
    expect(brandSlugFor(index, 'https://alice.github.io/project')).toBeNull()
    expect(brandSlugFor(index, 'https://github.io')).toBeNull()
    expect(brandSlugFor(index, 'https://alice.wordpress.com')).toBeNull()
  })

  it('does not prefix- or substring-match', () => {
    // Slack is not in simple-icons; Slackware is, but `slack` must not borrow it.
    expect(brandSlugFor(index, 'https://slack.com')).toBeNull()
    expect(brandSlugFor(index, 'https://slackware.com')).toBe('slackware')
  })

  it('keeps the index under 150 KB', () => {
    expect(Buffer.byteLength(JSON.stringify(index))).toBeLessThan(150 * 1024)
  })
})
