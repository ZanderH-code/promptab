import { lazy } from 'react'

export const BookmarkFolder = lazy(() => import('./BookmarkFolder').then(module => ({ default: module.BookmarkFolder })))
export const OnboardingCard = lazy(() => import('./OnboardingCard').then(module => ({ default: module.OnboardingCard })))
