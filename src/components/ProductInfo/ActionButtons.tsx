import CartIcon from '@/components/CartIcon';

interface ActionButtonsProps {
  stockQuantity: number;
  isAddedToCart: boolean;
  user: any;
  onAddToCart: () => void;
  onBuyNow: () => void;
}

export default function ActionButtons({
  stockQuantity,
  isAddedToCart,
  user,
  onAddToCart,
  onBuyNow,
}: ActionButtonsProps) {
  return (
    <div className="hidden sm:flex flex-col sm:flex-row gap-3">
      <button
        onClick={onAddToCart}
        disabled={stockQuantity === 0}
        className="flex-1 bg-yellow-500 text-white py-4 px-6 rounded font-medium hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-3 shadow hover:shadow-sm transform hover:scale-[1.02]"
      >
        <CartIcon className="w-5 h-5 flex-shrink-0" />
        <span className="text-base">
          {isAddedToCart ? 'Added to Cart!' : 'Add to Cart'}
        </span>
      </button>
      <button
        onClick={onBuyNow}
        disabled={stockQuantity === 0}
        className="flex-1 bg-orange-500 text-white py-4 px-6 rounded font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow hover:shadow-sm transform hover:scale-[1.02]"
      >
        {!user ? 'Login to Buy' : 'Buy Now'}
      </button>
    </div>
  );
}

