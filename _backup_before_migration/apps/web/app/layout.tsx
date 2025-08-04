import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MSMEBazaar V2.0 - Connect. Grow. Scale.',
  description: 'A modular platform to onboard MSMEs and match them with buyers, investors, and acquisition opportunities.',
  keywords: ['MSME', 'marketplace', 'investors', 'buyers', 'valuation', 'India'],
  authors: [{ name: 'MSMEBazaar Team' }],
  creator: 'MSMEBazaar',
  publisher: 'MSMEBazaar',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'MSMEBazaar V2.0 - Connect. Grow. Scale.',
    description: 'A modular platform to onboard MSMEs and match them with buyers, investors, and acquisition opportunities.',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    siteName: 'MSMEBazaar',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MSMEBazaar V2.0 - Connect. Grow. Scale.',
    description: 'A modular platform to onboard MSMEs and match them with buyers, investors, and acquisition opportunities.',
    creator: '@msmebazaar',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <div className="min-h-screen bg-background font-sans antialiased">
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                style: {
                  background: '#10b981',
                },
              },
              error: {
                style: {
                  background: '#ef4444',
                },
              },
            }}
          />
        </div>
      </body>
    </html>
  )
}