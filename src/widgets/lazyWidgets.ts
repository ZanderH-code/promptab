import { lazy } from 'react'

export const BookmarkFolder = lazy(() => import('./BookmarkFolder').then(module => ({ default: module.BookmarkFolder })))
