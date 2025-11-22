'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CrossIcon } from './Icons';
import { cn } from '@/lib/utils';

interface MobileSearchProps {
  searchQuery: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export default function MobileSearch({
  searchQuery,
  onInputChange,
  onSubmit,
  onClose,
}: MobileSearchProps) {
  return (
    <div id="mobile-search-container" className="sm:hidden flex-1 flex items-center h-full pr-2">
      <form onSubmit={onSubmit} className="relative w-full h-full" style={{ width: '100%', height: '100%' }}>
        <Input
          id="mobile-search-input"
          type="text"
          placeholder="Search products..."
          value={searchQuery}
          onChange={onInputChange}
          className={cn(
            "w-full h-full px-2 py-1.5 pl-3 pr-6 text-gray-700 bg-transparent rounded-[4px] text-sm",
            "border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          )}
          style={{ width: '100%', height: '100%' }}
          autoFocus
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute inset-y-0 right-0 pr-2 h-full text-gray-400 hover:text-red-600 transition-colors"
        >
          <CrossIcon className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}

