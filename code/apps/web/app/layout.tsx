import type { ReactNode } from 'react'
import './globals.css'

const sourceFamilies =
  'https://fonts.googleapis.com/css2?family=Source+Sans+3:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400;1,8..60,600&display=swap'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html className="h-full" lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href={sourceFamilies} rel="stylesheet" />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  )
}
