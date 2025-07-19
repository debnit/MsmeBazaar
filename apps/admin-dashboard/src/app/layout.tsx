import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'VyapaarMitra Admin Dashboard',
  description: 'Business Intelligence & System Monitoring Dashboard for VyapaarMitra',
  keywords: ['admin', 'dashboard', 'analytics', 'business intelligence', 'vyapaarmitra'],
  authors: [{ name: 'VyapaarMitra Team', url: 'https://vyapaarmitra.in' }],
  robots: 'noindex, nofollow', // Admin dashboard should not be indexed
  viewport: 'width=device-width, initial-scale=1',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={inter.className}>
        <Providers>
          <main className="min-h-screen bg-background">
            {children}
          </main>
          <Toaster position="top-right" richColors />
        </Providers>
      </body>
    </html>
  )
}