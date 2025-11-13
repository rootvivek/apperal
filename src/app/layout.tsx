import { type Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { CartProvider } from '@/contexts/CartContext'
import { WishlistProvider } from '@/contexts/WishlistContext'
import ClientLayout from '@/components/ClientLayout'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap', // Add font-display: swap for better performance
  preload: true,
  variable: '--font-inter',
  fallback: ['system-ui', 'arial'], // Fallback fonts for better text visibility
})

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
      <head>
        {/* Viewport meta tag to prevent zoom on mobile */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        {/* Resource hints for third-party domains - improves connection time */}
        <link rel="preconnect" href="https://ugzyijiuhchxbuiooclv.supabase.co" />
        <link rel="dns-prefetch" href="https://ugzyijiuhchxbuiooclv.supabase.co" />
        <link rel="preconnect" href="https://checkout.razorpay.com" />
        <link rel="dns-prefetch" href="https://checkout.razorpay.com" />
        <link rel="preconnect" href="https://api.razorpay.com" />
        <link rel="dns-prefetch" href="https://api.razorpay.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        {/* Preconnect to Google APIs for Firebase */}
        <link rel="preconnect" href="https://www.google.com" />
        <link rel="preconnect" href="https://apis.google.com" />
        <link rel="dns-prefetch" href="https://www.gstatic.com" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <ClientLayout>
                {children}
              </ClientLayout>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
