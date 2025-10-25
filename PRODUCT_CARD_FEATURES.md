# ProductCard Enhanced Features

## New Features Added

### 1. Price Structure
- **Current Price**: The selling price (`price` field)
- **Original Price**: The original price before discount (`original_price` field)
- **Discount Percentage**: Automatically calculated and displayed as a badge

### 2. Badges
- **Discount Badge**: Shows percentage off (e.g., "70% OFF") in top-left corner
- **New Badge**: Shows "NEW" in top-right corner for newly added products

### 3. Auto-Cycling Images
- Images automatically cycle every 2 seconds when hovering over the product card
- Only works when there are multiple images available

## Data Structure

To use these new features, your product data should include:

```typescript
interface ProductCardProduct {
  id: string;
  name: string;
  description: string;
  price: number;                    // Current selling price
  original_price?: number;          // Original price before discount
  is_new?: boolean;               // Flag for "Newly Added" badge
  category: string | object;
  subcategory: string;
  image_url: string;
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  images?: Array<{
    id: string;
    image_url: string;
    alt_text?: string;
    display_order: number;
  }>;
}
```

## Example Usage

```typescript
const sampleProduct = {
  id: "1",
  name: "Premium Wireless Headphones",
  description: "High-quality wireless headphones with noise cancellation",
  price: 2999,                    // Current price
  original_price: 4999,           // Original price (40% discount)
  is_new: true,                  // Shows "NEW" badge
  category: "Electronics",
  subcategory: "Audio",
  image_url: "/images/headphones-main.jpg",
  stock_quantity: 50,
  is_active: true,
  created_at: "2024-01-15T10:00:00Z",
  updated_at: "2024-01-15T10:00:00Z",
  images: [
    {
      id: "1",
      image_url: "/images/headphones-1.jpg",
      alt_text: "Headphones front view",
      display_order: 1
    },
    {
      id: "2", 
      image_url: "/images/headphones-2.jpg",
      alt_text: "Headphones side view",
      display_order: 2
    },
    {
      id: "3",
      image_url: "/images/headphones-3.jpg", 
      alt_text: "Headphones in case",
      display_order: 3
    }
  ]
};
```

## Visual Features

### Price Display
- Current price: **₹2,999.00** (bold, dark text)
- Original price: ~~₹4,999.00~~ (strikethrough, gray text)
- Discount badge: **40% OFF** (red background, white text)

### Badge Positioning
- Discount badge: Top-left corner
- New badge: Top-right corner
- Wishlist button: Automatically adjusts position to avoid badge conflicts

### Image Cycling
- Hover over the product card to start auto-cycling
- Images change every 2 seconds
- Stops when mouse leaves the card
- Only works with multiple images

## Implementation Notes

1. **Discount Calculation**: Automatically calculated as `((original_price - price) / original_price) * 100`
2. **Badge Visibility**: Only shows when conditions are met (discount > 0, is_new = true)
3. **Responsive Design**: Badges and buttons adjust positioning based on content
4. **Performance**: Image cycling only runs when card is hovered
5. **Accessibility**: Proper ARIA labels and semantic HTML structure
