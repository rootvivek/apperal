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
        {/* Clean shopping cart icon */}
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" 
        />
      </svg>
      {showCount && count > 0 && (
        <span className="cart-count-badge bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-md">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </div>
  );
}
