import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { CartProvider } from '@/contexts/CartContext'
import { WishlistProvider } from '@/contexts/WishlistContext'
import ConditionalNavigation from '@/components/ConditionalNavigation'
import FloatingCartButton from '@/components/FloatingCartButton'
import Footer from '@/components/Footer'

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
            <WishlistProvider>
              <ConditionalNavigation />
              {children}
              <Footer />
              <FloatingCartButton />
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
