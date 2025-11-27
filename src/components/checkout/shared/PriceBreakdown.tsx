'use client';

interface PriceBreakdownProps {
  subtotal: number;
  shipping: number;
  tax?: number;
  total: number;
  itemCount: number;
  showTax?: boolean;
}

export default function PriceBreakdown({
  subtotal,
  shipping,
  tax,
  total,
  itemCount,
  showTax = true,
}: PriceBreakdownProps) {
  const calculatedTax = tax ?? subtotal * 0.1;
  const finalTotal = tax ? total : subtotal + shipping + calculatedTax;

  return (
    <div className="space-y-2 sm:space-y-3">
      <div className="flex justify-between text-xs sm:text-sm">
        <span className="text-muted-foreground">Subtotal ({itemCount} items)</span>
        <span>₹{subtotal.toFixed(2)}</span>
      </div>
      <div className="flex justify-between text-xs sm:text-sm">
        <span className="text-muted-foreground">Shipping</span>
        <span className="text-green-500">FREE</span>
      </div>
      {showTax && calculatedTax > 0 && (
        <div className="flex justify-between text-xs sm:text-sm">
          <span className="text-muted-foreground">Tax</span>
          <span>₹{calculatedTax.toFixed(2)}</span>
        </div>
      )}
        <div className="flex justify-between pt-2 sm:pt-3 border-t border-border">
          <span className="text-sm sm:text-base">Total</span>
          <span className="text-lg sm:text-xl lg:text-2xl text-primary">₹{finalTotal.toFixed(2)}</span>
        </div>
    </div>
  );
}

