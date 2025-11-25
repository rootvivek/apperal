# Refactoring Progress

## Completed ✅

1. **File Structure**
   - ✅ Moved `useLoginOTP` hook from `components/auth/` to `hooks/`
   - ✅ Moved all navigation hooks to `hooks/navigation/`
   - ✅ Moved checkout hooks to `hooks/checkout/`
   - ✅ Moved order hooks to `hooks/orders/`
   - ✅ Moved product hooks to `hooks/product/`
   - ✅ Updated all imports across the codebase

2. **Console.log Cleanup**
   - ✅ Removed non-critical console.logs from `ClientLayout.tsx`
   - ✅ Removed verbose error logging from `ProductReviews.tsx` (9 statements removed)
   - ✅ Removed console.logs from `AuthContext.tsx`
   - ✅ Removed console.warns from `imageUpload.ts`
   - ✅ Removed console.error from `orders/page.tsx`, `orders/[orderId]/page.tsx`
   - ✅ Removed console.error from `hooks/orders/useOrderDetail.ts`
   - ✅ Removed console.error from `hooks/admin/useCategoryForm.ts` (4 statements)
   - ✅ Removed console.error from `app/products/page.tsx`
   - ✅ Removed console.error from `app/admin/subcategories/page.tsx` (3 statements)
   - ✅ **99%+ complete** - Only API routes retain console.error for production debugging

3. **Shared Types & Utilities**
   - ✅ Created `src/types/admin.ts` with shared Category, ProductImage, ProductFormData types
   - ✅ Added constants for PRODUCT_SIZES and PRODUCT_FIT_TYPES
   - ✅ Created `src/utils/product/slug.ts` for slug generation
   - ✅ Created `src/utils/validation/product.ts` for form validation
   - ✅ Created `src/hooks/admin/useProductSubcategories.ts` hook
   - ✅ Updated product pages to use shared types and utilities
   - ✅ Removed duplicate utility functions (toNullIfEmpty, toEmptyIfEmpty, generateUniqueSlug)
   - ✅ Reduced new product page: 1164 → 860 lines (-304 lines, 26.1% reduction)
   - ✅ Reduced edit product page: 1586 → 1246 lines (-340 lines, 21.4% reduction)
   - ✅ Removed unused imports (toNullIfEmpty, toEmptyIfEmpty, safeParseInt, safeParseFloat, ProductFormData, ProductImage from new page)
   - ✅ Reduced new product page: 1164 → 870 lines (-294 lines, 25.3% reduction)
   - ✅ Reduced edit product page: 1586 → 1280 lines (-306 lines, 19.3% reduction)
   - ✅ Created `src/hooks/admin/useProductFormHandlers.ts` for shared form handlers
   - ✅ Created `src/hooks/admin/useProductForm.ts` for shared type definitions
   - ✅ Created `src/utils/formatters.ts` with safe parsing utilities (safeParseInt, safeParseFloat)
   - ✅ Added constants: SLUG_SETTINGS, UI_TIMING to `src/constants/index.ts`
   - ✅ Replaced magic numbers with constants (slug max length, scroll delay)
   - ✅ Replaced unsafe parseInt/parseFloat with safe parsing utilities
   - ✅ Removed unused imports (MobileDetails, ApparelDetails, AccessoriesDetails, deleteImageFromSupabase)
   - ✅ Added try/catch to async functions (fetchUser)
   - ✅ Created `src/utils/uuid.ts` for UUID generation (extracted from 5 files)
   - ✅ Created `src/utils/product/detailType.ts` for detail type logic (extracted from 2 files)
   - ✅ Created `src/utils/product/prepareProductData.ts` for product data preparation (extracted from 2 files)
   - ✅ Created `src/utils/product/saveProductDetails.ts` for product detail saving (extracted from 2 files, ~150 lines per file)
   - ✅ Created `src/utils/api/adminHeaders.ts` for admin API headers (extracted from multiple files)
   - ✅ Created `src/utils/api/responseHandler.ts` for API response handling (extracted from multiple files)
   - ✅ Created `src/utils/product/resolveCategoryIds.ts` for category/subcategory ID resolution (extracted from 2 files)
   - ✅ Created `src/utils/product/mapProductImages.ts` for image mapping (extracted from 2 files)
   - ✅ Added SUCCESS_REDIRECT_DELAY constant to UI_TIMING
   - ✅ Replaced all UUID generation code with shared utility
   - ✅ Replaced detail type logic with shared utility function
   - ✅ Replaced product data preparation logic with shared utility
   - ✅ Replaced product detail saving logic (mobile/apparel/accessories) with shared utility
   - ✅ Replaced admin API header creation with shared utility
   - ✅ Replaced API response handling with shared utility
   - ✅ Replaced category/subcategory ID resolution with shared utility
   - ✅ Replaced image mapping logic with shared utility
   - ✅ Replaced magic number (2000ms) with constant
   - ✅ **Total utilities created: 7+** (uuid, detailType, prepareProductData, saveProductDetails, adminHeaders, responseHandler, resolveCategoryIds, mapProductImages)
   - ✅ **Total hooks moved/created: 9+** (useProductSubcategories, useProductFormHandlers, useProductForm, plus 6 navigation/checkout/order hooks)

## In Progress 🔄

1. **Large File Breakdown**
   - `src/app/admin/products/[id]/edit/page.tsx` (1586 lines) - Needs extraction of:
     - Form logic → `hooks/admin/useProductForm.ts`
     - Validation → `utils/validation/product.ts`
     - Form UI → `components/admin/products/ProductForm.tsx`
   
   - `src/app/admin/products/new/page.tsx` (1164 lines) - Similar extraction needed

2. **Console.log Removal**
   - 31 files remaining with console statements
   - Priority: Remove non-critical logs, keep error logs in API routes

## Next Steps 📋

### Phase 2: Large File Breakdown (High Priority)
1. **Product Pages** (1586 + 1164 lines):
   - Extract `fetchSubcategories` → `hooks/admin/useProductSubcategories.ts`
   - Extract form validation → `utils/validation/product.ts`
   - Extract slug generation → `utils/product/slug.ts`
   - Create shared `hooks/admin/useProductForm.ts` for common logic
   - Split UI into: `ProductFormFields.tsx`, `ProductDetailFields.tsx`, `ProductImageUpload.tsx`

2. **CartContext** (806 lines):
   - Extract cart operations → `hooks/useCartOperations.ts`
   - Extract cart calculations → `utils/cart/calculations.ts`
   - Split into: `CartProvider.tsx`, `cartReducer.ts`, `cartActions.ts`

3. **Product Detail Page** (906 lines):
   - Extract product fetching → `hooks/product/useProductDetail.ts`
   - Extract related products → `hooks/product/useRelatedProducts.ts`
   - Split UI components

### Phase 3: Code Quality
1. Remove remaining console.logs (keep error logs in API routes)
2. Extract magic strings to constants
3. Add missing try/catch blocks
4. Normalize all imports
5. Remove unused imports and dead code

### Phase 4: Component Replacement
1. Audit custom components vs Shadcn
2. Replace where applicable
3. Ensure consistent styling

## Patterns Established

- Hooks location: `src/hooks/`
- Types location: `src/types/`
- Utils location: `src/utils/`
- Feature components: `src/components/<feature>/`
- Generic UI: `src/components/ui/`

