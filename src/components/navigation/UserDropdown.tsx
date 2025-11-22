'use client';

import Link from 'next/link';
import { UserIcon, ChevronDownIcon, OrdersIcon, SignOutIcon, AdminIcon } from './Icons';
import { mobileTypography } from '@/utils/mobileTypography';
import { useLoginModal } from '@/contexts/LoginModalContext';

interface UserDropdownProps {
  isUserLoggedIn: boolean;
  userFullName: string | null;
  isAdmin: boolean;
  showUserDropdown: boolean;
  setShowUserDropdown: (show: boolean) => void;
  signingOut: boolean;
  onSignOut: () => Promise<void>;
  isMounted: boolean;
  showMobileSearch: boolean;
}

export default function UserDropdown({
  isUserLoggedIn,
  userFullName,
  isAdmin,
  showUserDropdown,
  setShowUserDropdown,
  signingOut,
  onSignOut,
  isMounted,
  showMobileSearch,
}: UserDropdownProps) {
  const { openModal: openLoginModal } = useLoginModal();

  if (!isUserLoggedIn) {
    return (
      <>
        <button
          type="button"
          onClick={() => isMounted && openLoginModal()}
          className="sm:hidden text-gray-500 hover:text-brand-500 p-2"
          aria-label="Sign In"
          suppressHydrationWarning
        >
          <UserIcon className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
        </button>
        
        <div className="hidden sm:flex items-center" suppressHydrationWarning>
          <button
            type="button"
            onClick={() => isMounted && openLoginModal()}
            className={`bg-white text-brand-500 px-3 sm:px-4 py-1 sm:py-2 rounded-md ${mobileTypography.title14} sm:text-base font-normal hover:bg-brand-50 transition-colors`}
          >
            Sign In
          </button>
        </div>
      </>
    );
  }

  return (
    <div 
      id="user-dropdown" 
      className="relative flex items-center h-full"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShowUserDropdown(!showUserDropdown);
        }}
        className="hidden sm:flex items-center space-x-1 text-gray-500 hover:text-brand-500 transition-colors cursor-pointer"
      >
        <UserIcon />
        <span className={`${mobileTypography.title14} sm:text-base text-gray-900`}>
          {userFullName || 'Hi, User'}
        </span>
        <ChevronDownIcon rotated={showUserDropdown} />
      </button>
      
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShowUserDropdown(!showUserDropdown);
        }}
        className="sm:hidden text-gray-500 hover:text-brand-500 p-2"
      >
        <UserIcon className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
      </button>
      
      {/* Dropdown Menu */}
      {showUserDropdown && (
        <div 
          className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-xl border border-gray-200 z-[100]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="py-1">
            <Link
              href="/profile"
              onClick={() => setShowUserDropdown(false)}
              className={`block px-4 py-2 ${mobileTypography.title14} text-gray-700 hover:bg-gray-100 hover:text-brand-500 transition-colors cursor-pointer`}
            >
              <div className="flex items-center space-x-1.5">
                <UserIcon className="w-4 h-4" />
                <span>View Profile</span>
              </div>
            </Link>
            <Link
              href="/orders"
              onClick={() => setShowUserDropdown(false)}
              className={`block px-4 py-2 ${mobileTypography.title14} text-gray-700 hover:bg-gray-100 hover:text-brand-500 transition-colors cursor-pointer`}
            >
              <div className="flex items-center space-x-1.5">
                <OrdersIcon className="w-4 h-4" />
                <span>Orders</span>
              </div>
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setShowUserDropdown(false)}
                className={`block px-4 py-2 ${mobileTypography.title14} text-gray-700 hover:bg-gray-100 hover:text-purple-600 transition-colors cursor-pointer`}
              >
                <div className="flex items-center space-x-1.5">
                  <AdminIcon className="w-4 h-4" />
                  <span>Go to Admin Dashboard</span>
                </div>
              </Link>
            )}
            <div className="border-t border-gray-200 my-1"></div>
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                setShowUserDropdown(false);
                await onSignOut();
              }}
              disabled={signingOut}
              className={`w-full text-left block px-4 py-2 ${mobileTypography.title14} text-gray-700 hover:bg-gray-100 hover:text-red-600 transition-colors disabled:opacity-50 cursor-pointer`}
            >
              <div className="flex items-center space-x-1.5">
                <SignOutIcon className="w-4 h-4" />
                <span suppressHydrationWarning>{signingOut ? 'Signing out...' : 'Sign Out'}</span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

