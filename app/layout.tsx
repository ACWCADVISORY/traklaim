import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Traklaim — SR&ED Tracking Platform',
  description: 'Real-time SR&ED tax credit tracking for Canadian life sciences and biotech companies.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
