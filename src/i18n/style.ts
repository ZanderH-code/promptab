/**
 * Safe-mode and CSS-guard messages the page itself can show. Spread into the main dictionaries; the custom CSS
 * editor and font strings are settings-only and live in lazy.ts (CSS issues in ai.ts, with the CSS checks).
 */
const messages = {
  "safe.banner": ['安全模式：自定义样式已暂停', 'Safe mode: custom styles are paused'],
  "safe.hint": ['你的 CSS 仍然保存着，只是本次页面不加载。', 'Your CSS is still saved; it is just not loaded on this page.'],
  "safe.editCss": ['编辑 CSS', 'Edit CSS'],
  "safe.rollback": ['回滚到上一版本', 'Roll back to previous version'],
  "safe.rollbackNone": ['没有更早的版本可回滚', 'No earlier version to roll back to'],
  "safe.exit": ['退出', 'Exit'],
  "safe.autoEntered": ['自定义 CSS 让设置入口无法使用，已自动进入安全模式。', 'Custom CSS made the settings entry unusable, so safe mode was started.'],
  "css.rolledBack": ['这段 CSS 会让设置入口无法使用，已自动恢复到之前的样式。', 'That CSS made the settings entry unusable, so the previous styles were restored.'],
  "css.previewRejected": ['预览的 CSS 会让设置入口无法使用，已放弃预览。', 'The previewed CSS made the settings entry unusable, so the preview was discarded.'],
} as const

type ChineseMessages = { readonly [Key in keyof typeof messages]: (typeof messages)[Key][0] }

export const styleZh = Object.fromEntries(
  Object.entries(messages).map(([key, [zh]]) => [key, zh]),
) as ChineseMessages
export const styleEn: Record<keyof typeof styleZh, string> = Object.fromEntries(
  Object.entries(messages).map(([key, [, en]]) => [key, en]),
) as Record<keyof typeof styleZh, string>
