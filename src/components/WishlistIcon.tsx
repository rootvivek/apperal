'use client';

interface WishlistIconProps {
  className?: string;
  showCount?: boolean;
  count?: number;
  onClick?: () => void;
}

export default function WishlistIcon({ 
  className = "w-5 h-5", 
  showCount = false, 
  count = 0,
  onClick 
}: WishlistIconProps) {
  return (
    <div className="wishlist-icon-container" onClick={onClick}>
      <svg 
        className={`${className} transition-all duration-200 hover:scale-110 cursor-pointer`} 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        {/* Heart icon */}
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
        />
      </svg>
      {showCount && count > 0 && (
        <span className="wishlist-count-badge bg-red-500 text-white text-[10px] sm:text-xs font-bold rounded-full flex items-center justify-center shadow-md">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </div>
  );
}
