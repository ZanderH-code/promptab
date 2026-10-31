import { openDB } from 'idb'
const database = () => openDB('minimal-new-tab', 1, { upgrade(db) { db.createObjectStore('images') } })
export async function readWallpaper(): Promise<Blob | undefined> { return (await database()).get('images', 'wallpaper') }
export async function writeWallpaper(file: Blob | null) { const db = await database(); if (file) await db.put('images', file, 'wallpaper'); else await db.delete('images', 'wallpaper') }
export function validateImage(file: File, max: number) { if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > max) throw new Error(`请选择不超过 ${max / 1024 / 1024} MB 的 PNG、JPEG 或 WebP 图片`) }
