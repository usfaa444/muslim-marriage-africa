import type { ReactNode } from 'react'
import { Source_Sans_3, Source_Serif_4 } from 'next/font/google'
import './globals.css'

const sans = Source_Sans_3({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-source-sans',
  display: 'swap',
})

const serif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-source-serif',
  display: 'swap',
})

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html className={`${sans.variable} ${serif.variable} h-full`} lang="fr">
      <body className="min-h-full">{children}</body>
    </html>
  )
}
