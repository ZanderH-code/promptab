import type { Language } from '../i18n'

export type SyncMessage = 'title' | 'hint' | 'enable' | 'extensionOnly' | 'conflict' | 'keepLocal' | 'pullCloud' | 'undo' | 'saved' | 'disabled' | 'pulled' | 'undone' | 'quota' | 'error' | 'deleteCloud' | 'deleteConfirm' | 'deleted' | 'missing' | 'undoUnavailable'

const messages: Record<Language, Record<SyncMessage, string>> = {
  en: {
    title: 'Browser sync',
    hint: 'Optional Chrome Sync sends shortcuts, groups, theme settings and layout to your signed-in browser account. Wallpaper, uploaded fonts and bookmark images stay on this device. Full backups remain available as files.',
    enable: 'Sync this profile across devices',
    extensionOnly: 'Browser sync is available in the installed extension.',
    conflict: 'The local and browser sync profiles differ. Choose which copy to use.',
    keepLocal: 'Keep local profile',
    pullCloud: 'Pull newer profile',
    undo: 'Undo pulled profile',
    saved: 'Profile synced.',
    disabled: 'Browser sync is off on this device.',
    pulled: 'Newer profile pulled. You can undo this change.',
    undone: 'Pulled profile was undone.',
    quota: 'This profile is too large for browser sync. Use Export backup to move the full profile.',
    error: 'Could not read or write browser sync data.',
    deleteCloud: 'Delete browser sync data',
    deleteConfirm: 'Delete the synced profile from your browser account and turn sync off on this device?',
    deleted: 'Browser sync data deleted; sync is off on this device.',
    missing: 'The browser sync copy is missing. Your local profile was kept.',
    undoUnavailable: 'Undo is no longer available because the profile has changed.',
  },
  'zh-CN': {
    title: '浏览器同步',
    hint: '可选的 Chrome 同步会将快捷方式、分组、主题设置和布局发送到当前登录的浏览器账号。壁纸、上传的字体和书签图片仍保存在此设备。完整备份仍可导出为文件。',
    enable: '在设备间同步此配置',
    extensionOnly: '浏览器同步仅在已安装的扩展中可用。',
    conflict: '本地配置与浏览器同步配置不同，请选择使用哪一份。',
    keepLocal: '保留本地配置',
    pullCloud: '拉取较新配置',
    undo: '撤销拉取的配置',
    saved: '配置已同步。',
    disabled: '此设备上的浏览器同步已关闭。',
    pulled: '已拉取较新配置，可撤销此更改。',
    undone: '已撤销拉取的配置。',
    quota: '配置过大，无法通过浏览器同步。请使用“导出备份”迁移完整配置。',
    error: '无法读取或写入浏览器同步数据。',
    deleteCloud: '删除浏览器同步数据',
    deleteConfirm: '确定删除浏览器账号中的同步配置，并关闭此设备上的同步吗？',
    deleted: '浏览器同步数据已删除，此设备上的同步已关闭。',
    missing: '浏览器同步副本不存在。本地配置已保留。',
    undoUnavailable: '配置已更改，无法撤销拉取。',
  },
}

export const syncText = (language: Language, key: SyncMessage) => messages[language][key]
