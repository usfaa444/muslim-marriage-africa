import type { Metadata } from 'next'
import { LandingPage } from '../src/landing'

export const metadata: Metadata = { title: 'Public landing' }

export default function Page() {
  return <LandingPage />
}
