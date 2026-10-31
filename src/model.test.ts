import { describe, expect, it } from 'vitest'
import { defaults, validate, searchUrl } from './model'
describe('配置', () => {
  it('接受默认配置并拒绝损坏数据', () => { expect(validate(defaults)).toEqual(defaults); expect(() => validate({schemaVersion: 99})).toThrow() })
  it('拒绝非 HTTP 快捷方式', () => { expect(() => validate({...defaults, shortcuts:[{id:'1',name:'x',url:'javascript:alert(1)',color:'#ffffff',icon:'X'}]})).toThrow() })
  it('为旧配置补充布局默认值', () => { const old = { ...defaults } as Record<string, unknown>; delete old.columns; delete old.iconShape; delete old.iconSize; delete old.alignment; expect(validate(old).columns).toBe(6) })
  it('拒绝未知布局模式并兼容旧配置', () => { expect(validate(defaults).layout).toBe('stacked'); expect(() => validate({...defaults, layout:'invalid'})).toThrow() })
  it('兼容旧配置并校验语言', () => { const old = {...defaults} as Record<string, unknown>; delete old.language; expect(validate(old).language).toBe('zh-CN'); expect(validate({...defaults, language:'en'}).language).toBe('en'); expect(() => validate({...defaults, language:'invalid'})).toThrow() })
  it('拒绝超出范围的列数', () => { expect(() => validate({...defaults, columns: 99})).toThrow() })
  it('编码搜索内容并忽略空输入', () => { expect(searchUrl('https://example.com/?q={query}', '中文 &')).toBe('https://example.com/?q=%E4%B8%AD%E6%96%87%20%26'); expect(searchUrl('https://example.com/?q={query}', ' ')).toBeNull() })
})
