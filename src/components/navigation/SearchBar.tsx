'use client';

import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  className?: string;
  onClose?: () => void;
}

export default function SearchBar({ 
  placeholder = 'Search for products, brands and more...',
  onSearch,
  className = '',
  onClose,
}: SearchBarProps) {
  const router = useRouter();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const query = (e.target as HTMLInputElement).value;
      if (query.trim()) {
        if (onSearch) {
          onSearch(query);
        } else {
          router.push(`/search?q=${encodeURIComponent(query)}`);
        }
        if (onClose) {
          onClose();
        }
      }
    }
  };

  return (
    <div className={`relative w-full group ${className}`}>
      <input
        type="text"
        placeholder={placeholder}
        className="w-full pl-10 sm:pl-11 md:pl-12 pr-4 py-2 sm:py-2.5 md:py-3 text-sm sm:text-sm md:text-base border border-gray-200 rounded-xl focus:outline-none focus:border-gray-300 transition-all bg-gray-50 focus:bg-white"
        onKeyDown={handleKeyDown}
      />
      <Search className="w-4 h-4 sm:w-4 md:w-5 text-gray-400 absolute left-3 sm:left-3.5 md:left-4 top-1/2 -translate-y-1/2 group-focus-within:text-gray-600 transition-colors" />
    </div>
  );
}

