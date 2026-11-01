import type { MessageKey, Translate } from '../../i18n'
import type { CssIssue } from './sanitize'

/** The localized sentence for one stylesheet problem (without its position). */
export const cssIssueText = (t: Translate, issue: CssIssue) => t(`css.issue.${issue.code}` as MessageKey, { detail: issue.detail ?? '' })
