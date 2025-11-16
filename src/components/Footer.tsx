import Link from 'next/link';
import Image from 'next/image';

interface FooterProps {
  className?: string;
}

export default function Footer({ className = '' }: FooterProps) {
  return (
    <footer className={`bg-gray-900 text-white ${className}`}>
      <div className="px-2 sm:px-4 md:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <img 
              src="/logo.webp" 
              alt="Carts24" 
              className="h-8 w-auto"
              style={{ maxWidth: '120px' }}
              width={96}
              height={93}
              loading="lazy"
            />
            <p className="text-gray-300 text-sm leading-relaxed">
              Your one-stop destination for fashion, electronics, and lifestyle products. 
              Quality products at affordable prices with fast delivery across India.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-emerald-400 transition-colors">
                <span className="sr-only">Facebook</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-emerald-400 transition-colors">
                <span className="sr-only">Instagram</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987s11.987-5.367 11.987-11.987C24.004 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.323-1.297C4.198 14.895 3.708 13.744 3.708 12.447s.49-2.448 1.418-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.928.875 1.418 2.026 1.418 3.323s-.49 2.448-1.418 3.244c-.875.807-2.026 1.297-3.323 1.297zm7.83-9.781c-.49 0-.928-.175-1.297-.49-.368-.315-.49-.753-.49-1.243s.122-.928.49-1.243c.369-.315.807-.49 1.297-.49s.928.175 1.297.49c.368.315.49.753.49 1.243s-.122.928-.49 1.243c-.369.315-.807.49-1.297.49z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-emerald-400 transition-colors">
                <span className="sr-only">Twitter</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-emerald-400 transition-colors">
                <span className="sr-only">YouTube</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.894 8.19 22 9.58 22 12s-.106 3.81-.42 4.814c-.23.861-.907 1.538-1.768 1.768-1.004.314-2.394.42-4.814.42s-3.81-.106-4.814-.42c-.861-.23-1.538-.907-1.768-1.768C8.106 15.81 8 14.42 8 12s.106-3.81.42-4.814c.23-.861.907-1.538 1.768-1.768C11.19 5.106 12.58 5 15 5s3.81.106 4.814.42zM15 8.5l-4 2.5v5l4-2.5v-5z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links and Customer Service in one row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                  <Link href="/" className="text-gray-300 hover:text-emerald-400 transition-colors text-sm">
                  Home
                </Link>
              </li>
              <li>
                  <Link href="/products" className="text-gray-300 hover:text-emerald-400 transition-colors text-sm">
                  All Products
                </Link>
              </li>
              <li>
                  <Link href="/products/mens-clothing" className="text-gray-300 hover:text-emerald-400 transition-colors text-sm">
                  Men&apos;s Clothing
                </Link>
              </li>
              <li>
                  <Link href="/products/womens-clothing" className="text-gray-300 hover:text-emerald-400 transition-colors text-sm">
                  Women&apos;s Clothing
                </Link>
              </li>
              <li>
                  <Link href="/products/accessories" className="text-gray-300 hover:text-emerald-400 transition-colors text-sm">
                  Accessories
                </Link>
              </li>
              <li>
                  <Link href="/products/electronics" className="text-gray-300 hover:text-emerald-400 transition-colors text-sm">
                  Electronics
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Customer Service</h3>
            <ul className="space-y-2">
              <li>
                  <Link href="/contact" className="text-gray-300 hover:text-emerald-400 transition-colors text-sm">
                  Contact Us
                </Link>
              </li>
              <li>
                  <Link href="/shipping" className="text-gray-300 hover:text-emerald-400 transition-colors text-sm">
                  Shipping Info
                </Link>
              </li>
              <li>
                  <Link href="/returns" className="text-gray-300 hover:text-emerald-400 transition-colors text-sm">
                  Returns & Exchanges
                </Link>
              </li>
              <li>
                  <Link href="/size-guide" className="text-gray-300 hover:text-emerald-400 transition-colors text-sm">
                  Size Guide
                </Link>
              </li>
              <li>
                  <Link href="/faq" className="text-gray-300 hover:text-emerald-400 transition-colors text-sm">
                  FAQ
                </Link>
              </li>
              <li>
                  <Link href="/track-order" className="text-gray-300 hover:text-emerald-400 transition-colors text-sm">
                  Track Your Order
                </Link>
              </li>
            </ul>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Contact Info</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <svg className="h-5 w-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <p className="text-gray-300 text-sm">123 Fashion Street</p>
                  <p className="text-gray-300 text-sm">Mumbai, Maharashtra 400001</p>
                  <p className="text-gray-300 text-sm">India</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <p className="text-gray-300 text-sm">8881765192</p>
              </div>
              <div className="flex items-center space-x-3">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-300 text-sm">rootvivek@gmail.com</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 py-6">
          <div className="flex flex-col md:flex-row justify-center items-center space-y-4 md:space-y-0">
            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6">
              <p className="text-gray-400 text-sm">
                © 2024 Carts24. All rights reserved.
              </p>
              <div className="flex space-x-6">
                <Link href="/privacy" className="text-gray-400 hover:text-emerald-400 transition-colors text-sm">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="text-gray-400 hover:text-emerald-400 transition-colors text-sm">
                  Terms of Service
                </Link>
                <Link href="/cookies" className="text-gray-400 hover:text-emerald-400 transition-colors text-sm">
                  Cookie Policy
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
