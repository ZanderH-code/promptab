import { openDB } from 'idb'

const database = () => openDB('minimal-new-tab', 1, { upgrade(db) { db.createObjectStore('images') } })

export async function readWallpaper(): Promise<Blob | undefined> {
  return (await database()).get('images', 'wallpaper')
}
