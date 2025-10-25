'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function NotFound() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4">
      <div className="mx-auto text-center">
        {/* Animated 404 */}
        <div className={`transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="relative mb-8">
            <h1 className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 animate-pulse">
              404
            </h1>
            <div className="absolute -top-4 -right-4 w-8 h-8 bg-yellow-400 rounded-full animate-bounce"></div>
            <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-pink-400 rounded-full animate-bounce delay-300"></div>
            <div className="absolute top-1/2 -right-8 w-4 h-4 bg-green-400 rounded-full animate-bounce delay-700"></div>
          </div>
        </div>

        {/* Error Message */}
        <div className={`transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Oops! Page Not Found
          </h2>
          <p className="text-lg text-gray-600 mb-8 leading-relaxed">
            The page you're looking for seems to have wandered off into the digital void. 
            Don't worry, even the best explorers sometimes take a wrong turn!
          </p>
        </div>

        {/* Animated Illustration */}
        <div className={`transition-all duration-1000 delay-500 ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
          <div className="mb-8 flex justify-center">
            <div className="relative">
              {/* Floating elements */}
              <div className="w-32 h-32 bg-gradient-to-br from-blue-200 to-purple-200 rounded-full flex items-center justify-center animate-float">
                <svg className="w-16 h-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.709" />
                </svg>
              </div>
              
              {/* Floating particles */}
              <div className="absolute -top-2 -left-2 w-3 h-3 bg-blue-400 rounded-full animate-ping"></div>
              <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-purple-400 rounded-full animate-ping delay-1000"></div>
              <div className="absolute top-1/2 -right-4 w-2 h-2 bg-pink-400 rounded-full animate-ping delay-500"></div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={`transition-all duration-1000 delay-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              🏠 Go Home
            </Link>
            <Link
              href="/products"
              className="px-8 py-3 bg-white text-gray-700 font-semibold rounded-lg border-2 border-gray-300 hover:border-blue-500 hover:text-blue-600 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              🛍️ Browse Products
            </Link>
          </div>
        </div>

        {/* Helpful Links */}
        <div className={`transition-all duration-1000 delay-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-4">Need help? Try these popular pages:</p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <Link href="/products/mens-clothing" className="text-blue-600 hover:text-blue-800 hover:underline">
                Men's Clothing
              </Link>
              <Link href="/products/womens-clothing" className="text-blue-600 hover:text-blue-800 hover:underline">
                Women's Clothing
              </Link>
              <Link href="/products/accessories" className="text-blue-600 hover:text-blue-800 hover:underline">
                Accessories
              </Link>
              <Link href="/cart" className="text-blue-600 hover:text-blue-800 hover:underline">
                Cart
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Background Animation */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob delay-4000"></div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
      `}</style>
    </div>
  );
}
