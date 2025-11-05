'use client';

interface CartIconProps {
  className?: string;
  showCount?: boolean;
  count?: number;
  onClick?: () => void;
}

export default function CartIcon({ 
  className = "w-5 h-5", 
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
        {/* Shopping cart icon */}
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" 
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
