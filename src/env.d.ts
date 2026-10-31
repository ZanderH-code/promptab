/// <reference types="vite/client" />
interface Window { chrome?: { runtime?: { getURL(path: string): string }; storage?: { local: { get(key: string): Promise<Record<string, unknown>>; set(value: Record<string, unknown>): Promise<void> } } } }
