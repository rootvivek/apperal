'use client';

import Link from 'next/link';
import { Package, Headphones } from 'lucide-react';

export default function TopBar() {
  return (
    <div
      className="text-white text-sm py-2 sm:py-2.5 md:py-2.5"
      style={{ background: 'linear-gradient(135deg, #D7882B 0%, #B87024 100%)' }}
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-5 md:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            <p className="text-white">Free shipping on orders over $50</p>
          </div>
          <div className="hidden md:flex gap-6 text-white">
            <button className="hover:text-white/80 transition-colors flex items-center gap-1.5">
              <Headphones className="w-4 h-4" />
              Support
            </button>
            <Link href="/orders" className="hover:text-white/80 transition-colors">
              Track Order
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

