'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLoginModal } from '@/contexts/LoginModalContext';
import AccountMenuItems from './AccountMenuItems';

interface AccountDropdownProps {
  user: any;
  onLogout?: () => void;
}

export default function AccountDropdown({ user, onLogout }: AccountDropdownProps) {
  const { signOut } = useAuth();
  const { openModal: openLoginModal } = useLoginModal();
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const handleAccountClick = () => {
    if (!user) {
      openLoginModal();
    } else {
      setShowAccountMenu(!showAccountMenu);
    }
  };

  const handleLogout = async () => {
    await (onLogout || signOut)();
    setShowAccountMenu(false);
  };

  const closeMenu = () => setShowAccountMenu(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowAccountMenu(true)}
      onMouseLeave={() => setShowAccountMenu(false)}
    >
      {/* Mobile: Icon only */}
      <button
        onClick={handleAccountClick}
        className="sm:hidden p-2 hover:bg-gray-50 rounded-xl transition-colors"
      >
        <User className="w-4 h-4 text-gray-700" />
      </button>

      {/* Tablet & Desktop: Icon with text */}
      <button
        onClick={handleAccountClick}
        className="hidden sm:flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 md:px-4 py-2 sm:py-2 md:py-2.5 hover:bg-gray-50 rounded-xl transition-colors"
      >
        <User className="w-4 h-4 sm:w-[18px] sm:h-[18px] md:w-5 md:h-5 text-gray-700" />
        <span className="text-xs sm:text-xs md:text-sm text-gray-700">{user ? 'Account' : 'Sign In'}</span>
        <ChevronDown className="w-3.5 h-3.5 sm:w-3.5 md:w-4 text-gray-500" />
      </button>

      {user && (
        <AnimatePresence>
          {showAccountMenu && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden w-56 z-50"
            >
              <div className="p-2">
                <AccountMenuItems onItemClick={closeMenu} onLogout={handleLogout} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

