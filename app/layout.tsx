import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, Noto_Sans } from 'next/font/google'
import './globals.css'

const notoSans = Noto_Sans({
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  variable: '--font-sans',
})

const cormorant = Cormorant_Garamond({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-serif',
})

export const metadata: Metadata = {
  title: 'IUH | Hành trình tốt nghiệp 2026',
  description: 'Trang kỷ niệm lễ tốt nghiệp Đại học Công nghiệp Thành phố Hồ Chí Minh.',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f4f1ea',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi">
      <body className={`${notoSans.variable} ${cormorant.variable} ${notoSans.className} antialiased`}>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
