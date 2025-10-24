import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { CartProvider } from '@/contexts/CartContext'
import ConditionalNavigation from '@/components/ConditionalNavigation'
import FloatingCartButton from '@/components/FloatingCartButton'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Apperal - Fashion & Apparel Store',
  description: 'Discover our wide selection of clothing and accessories for men, women, and kids',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <CartProvider>
            <ConditionalNavigation />
            {children}
            <FloatingCartButton />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
