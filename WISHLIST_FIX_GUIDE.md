# Wishlist Database Fix Guide

## Issues Found and Fixed

### 1. **Table Name Mismatch**
- **Problem**: Code was referencing `wishlist` table but the database schema uses `wishlists` (plural)
- **Location**: `src/contexts/WishlistContext.tsx`
- **Fix**: Changed all table references from `.from('wishlist')` to `.from('wishlists')`

### 2. **Database Code Was Commented Out**
- **Problem**: All database integration code in `WishlistContext.tsx` was wrapped in TODO comments
- **Location**: Lines 48-100 and 119-159 in the original file
- **Fix**: Uncommented all database-related code and removed the temporary localStorage-only implementation for logged-in users

### 3. **Incorrect Database Field Names**
- **Problem**: The original code referenced fields that don't exist in the products table:
  - `category` (should be `category_id`)
  - `subcategory` (doesn't exist as a single field)
  - `image_url` (doesn't exist in products table)
  - `is_active` (should be `in_stock`)
- **Fix**: Updated to use correct field names:
  ```
  id, name, slug, description, price, category_id, brand, 
  in_stock, stock_quantity, rating, review_count, created_at, updated_at
  ```

### 4. **Type Mismatch Between Database and Product Type**
- **Problem**: Database returns different field names and types than the Product interface expects
  - Database: `in_stock` (boolean), `category_id` (UUID), `created_at` (string)
  - Product type: `inStock` (boolean), `category` (ProductCategory object), `createdAt` (Date)
- **Fix**: Added transformation logic in `loadWishlist()` to convert database responses to Product type:
  ```typescript
  // Transform database product to Product type
  return {
    id: dbProduct.id,
    name: dbProduct.name,
    price: dbProduct.price,
    inStock: dbProduct.in_stock,  // Transform field name
    category: { ... },             // Build category object from category_id
    createdAt: new Date(dbProduct.created_at),  // Convert to Date
    // ... other fields
  };
  ```

### 5. **Wrong Supabase Import in API Route**
- **Problem**: API route tried to import `createClient` from server module and call it with `await`, but the function doesn't exist
- **Location**: `src/app/api/wishlist/route.ts`
- **Fix**: Changed to use `createServerClient()` which is the correct export:
  ```typescript
  import { createServerClient } from '@/lib/supabase/server';
  const supabase = createServerClient();  // No await needed
  ```

### 6. **Empty API Route**
- **Problem**: `src/app/api/wishlist/route.ts` was returning empty responses
- **Fix**: Implemented full API with:
  - **GET**: Fetch user's wishlist items with product details
  - **POST**: Add product to wishlist (with duplicate prevention)
  - **DELETE**: Remove product from wishlist
  - Proper authentication checks
  - Error handling with specific error codes

## Current Architecture

### Data Flow
1. **User Action** → ProductCard component's wishlist button
2. **WishlistContext** → Manages local state and database sync
   - For logged-in users: Reads/writes to `wishlists` table
   - For guest users: Uses browser localStorage
3. **Database** → Stores wishlist items linked to user profiles

### Database Schema (wishlists table)
```sql
CREATE TABLE wishlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id)  -- Prevents duplicate entries
);
```

### Row Level Security (RLS) Policies
- Users can only view their own wishlist items
- Users can only insert/delete their own wishlist items
- Automatic cascade deletion when users or products are deleted

## Implementation Details

### WishlistContext Features
- **Load on Mount**: Automatically loads wishlist from database for authenticated users
- **Type Transformation**: Converts database schema to Product interface format
- **Add to Wishlist**: Inserts item to database with duplicate detection
- **Remove from Wishlist**: Deletes item from database
- **Guest Support**: Falls back to localStorage for unauthenticated users
- **Type Safety**: Full TypeScript support with proper Product types

### API Route Features
- **Authentication**: Verifies user identity before operations using `createServerClient()`
- **Error Handling**: 
  - 401: Unauthorized access
  - 409: Item already in wishlist (unique constraint)
  - 400: Missing required fields
  - 500: Server errors
- **Security**: Uses server-side Supabase client for secure database access
- **Logging**: Console errors for debugging

## Field Mapping Reference

| Frontend (Product Type) | Database (products table) | Type |
|------------------------|--------------------------|------|
| `inStock` | `in_stock` | boolean |
| `category` (object) | `category_id` (UUID) | transformed to object |
| `createdAt` | `created_at` | Date (converted from string) |
| `updatedAt` | `updated_at` | Date (converted from string) |
| `reviewCount` | `review_count` | number |
| Other fields match 1:1 | | |

## Testing the Wishlist

### Manual Testing Steps
1. **Login** to the application
2. **Browse Products** and click the heart icon on any product
3. **Check Database**: Verify item appears in `wishlists` table
4. **View Wishlist**: Go to `/wishlist` page to see saved items
5. **Remove Item**: Click heart icon again to remove from wishlist
6. **Verify**: Check that item is removed from database
7. **Page Refresh**: Reload and verify wishlist persists

### Expected Behavior
- Heart icon shows red/filled when product is in wishlist
- Heart icon shows gray/outline when product is not in wishlist
- Wishlist persists across page refreshes
- Wishlist is unique per user
- Can't add same product twice
- No errors in browser console

### Browser Console Checks
Look for these success messages:
- `"Loaded wishlist from database: [...]"`
- `"Added to wishlist: [product name]"`
- `"Removed from wishlist: [product id]"`

## Troubleshooting

### If wishlist isn't loading:
1. Check browser console for errors
2. Verify user is authenticated (check `user` object exists in AuthContext)
3. Check Supabase logs for database errors
4. Ensure RLS policies are properly configured
5. Verify `wishlists` table exists in database

### If add/remove operations fail:
1. Verify user ID is correct in auth
2. Check product ID exists in products table
3. Review API response in browser DevTools Network tab (check `/api/wishlist` calls)
4. Check for duplicate entry (409) error vs other errors
5. Verify Supabase row level security policies

### If type errors occur:
1. Ensure Product type interface matches expected shape
2. Check transformation logic in `loadWishlist()`
3. Verify database response includes all required fields
4. Check console for parse errors on Date conversion

### For guest users:
- Wishlist uses browser localStorage
- Will be lost if browser data is cleared
- Recommend logging in to persist wishlist permanently
- Guest wishlist uses key `'guest-wishlist'` in localStorage

## Files Modified

### `src/contexts/WishlistContext.tsx`
- Enabled database integration
- Added type transformation for database responses
- Fixed error handling with proper response variable
- Support for both logged-in and guest users

### `src/app/api/wishlist/route.ts`
- Implemented full GET/POST/DELETE endpoints
- Fixed import to use `createServerClient()`
- Added proper authentication checks

## Files Not Modified (Already Correct)
- `src/components/ProductCard.tsx` - Already using wishlist context correctly
- `src/app/wishlist/page.tsx` - Already displaying wishlist correctly
- `src/components/WishlistIcon.tsx` - Presentational component
- Database schema - Already has correct table structure with RLS policies
