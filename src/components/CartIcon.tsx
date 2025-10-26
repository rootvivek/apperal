'use client';

interface CartIconProps {
  className?: string;
  showCount?: boolean;
  count?: number;
  onClick?: () => void;
}

export default function CartIcon({ 
  className = "w-6 h-6", 
  showCount = false, 
  count = 0,
  onClick 
}: CartIconProps) {
  return (
    <div className="cart-icon-container" onClick={onClick}>
      <svg 
        className={`${className} transition-all duration-200 hover:scale-110 cursor-pointer`} 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        {/* Modern shopping bag icon */}
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 7a2 2 0 01-2 2H8a2 2 0 01-2-2L5 9z" 
        />
      </svg>
      {showCount && count > 0 && (
        <span className="cart-count-badge bg-red-500 text-white text-[10px] sm:text-xs font-bold rounded-full flex items-center justify-center shadow-md">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </div>
  );
}
