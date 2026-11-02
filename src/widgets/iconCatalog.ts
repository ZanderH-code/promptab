import { BookOpen, Briefcase, Camera, Cloud, Code, Gamepad2, Globe, Heart, House, Mail, Music, Search, ShoppingBag, Star, Video } from 'lucide-react'

export const genericIcons = { house: House, globe: Globe, search: Search, mail: Mail, star: Star, heart: Heart, 'book-open': BookOpen, briefcase: Briefcase, camera: Camera, cloud: Cloud, code: Code, 'gamepad-2': Gamepad2, music: Music, 'shopping-bag': ShoppingBag, video: Video }
export const emojis = ['🌐', '⭐', '❤️', '📚', '🎵', '🎮', '📷', '🛒', '💼', '🌻', '🚀', '☕']

export type BrandIcon = { title: string; slug: string; path: string; hex: string }
let catalog: Promise<BrandIcon[]> | undefined
export function loadBrands() {
  return catalog ??= (import.meta.env.DEV
    ? import('simple-icons').then(module => Object.values(module) as BrandIcon[])
    : fetch(new URL('../brand-catalog.json', import.meta.url)).then(response => {
      if (!response.ok) throw new Error('Brand catalog unavailable')
      return response.json() as Promise<BrandIcon[]>
    })).catch(error => { catalog = undefined; throw error })
}
