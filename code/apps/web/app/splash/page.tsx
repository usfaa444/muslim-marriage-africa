import type { Metadata } from 'next'
import { SplashPage } from '../../src/splash'

export const metadata: Metadata = { title: 'AnKanu — Splash' }

export default function Page() {
  return <SplashPage />
}
