import { useSyncExternalStore } from 'react'
import { messagesVersion, subscribeMessages } from './index'

/** Re-renders when a lazy chunk registers its messages after this component mounted. */
export function useMessagesVersion() {
  return useSyncExternalStore(subscribeMessages, messagesVersion)
}
