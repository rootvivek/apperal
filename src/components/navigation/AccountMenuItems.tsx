'use client';

import Link from 'next/link';

interface AccountMenuItemsProps {
  onItemClick: () => void;
  onLogout: () => void;
}

const menuItems = [
  { href: '/profile', label: 'My Profile' },
  { href: '/orders', label: 'Orders' },
  { href: '/wishlist', label: 'Wishlist' },
  { href: '/settings', label: 'Settings' },
];

export default function AccountMenuItems({ onItemClick, onLogout }: AccountMenuItemsProps) {
  return (
    <>
      {menuItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onItemClick}
          className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
        >
          {item.label}
        </Link>
      ))}
      <div className="border-t border-gray-100 my-2"></div>
      <button
        onClick={onLogout}
        className="w-full text-left block px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
      >
        Logout
      </button>
    </>
  );
}

