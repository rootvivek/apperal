import { type Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { CartProvider } from '@/contexts/CartContext'
import { WishlistProvider } from '@/contexts/WishlistContext'
import ClientLayout from '@/components/ClientLayout'

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
        {/* Preload Geist fonts for better performance */}
        <link rel="preload" href="/fonts/geist/Geist-Regular.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/geist/Geist-Medium.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        {/* Resource hints for critical third-party domains - limited to essential origins */}
        <link rel="preconnect" href="https://ugzyijiuhchxbuiooclv.supabase.co" />
        <link rel="dns-prefetch" href="https://ugzyijiuhchxbuiooclv.supabase.co" />
        {/* Note: Razorpay preconnects removed - only needed when checkout is opened, not on initial load */}
        {/* Note: Firebase preconnect removed - added dynamically when Firebase is lazy-loaded */}
      </head>
      <body>
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
