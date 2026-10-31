import { openDB } from 'idb'

const database = () => openDB('minimal-new-tab', 1, { upgrade(db) { db.createObjectStore('images') } })

export async function readWallpaper(): Promise<Blob | undefined> {
  return (await database()).get('images', 'wallpaper')
}

export async function writeWallpaper(file: Blob | null) {
  const db = await database()
  if (file) await db.put('images', file, 'wallpaper')
  else await db.delete('images', 'wallpaper')
}
