import { safeParseInt, safeParseFloat } from '@/utils/formatters';
import { toNullIfEmpty } from '@/utils/formUtils';
import type { ExtendedProductFormData } from '@/hooks/admin/useProductForm';

interface PrepareProductDataParams {
  formData: ExtendedProductFormData;
  categoryId: string | null;
  subcategoryId: string | null;
  productUuid?: string | null;
  isEdit?: boolean;
}

/**
 * Prepares product data for database insertion/update
 * Handles common product fields that go into the products table
 */
export function prepareProductData({
  formData,
  categoryId,
  subcategoryId,
  productUuid,
  isEdit = false,
}: PrepareProductDataParams): Record<string, any> {
  const baseData: Record<string, any> = {
    name: formData.name.trim(),
    description: formData.description.trim(),
    price: safeParseFloat(formData.price),
    original_price: formData.original_price ? safeParseFloat(formData.original_price) : null,
    stock_quantity: safeParseInt(formData.stock_quantity),
    is_active: formData.is_active,
    show_in_hero: formData.show_in_hero,
    category_id: categoryId,
    subcategory_id: subcategoryId,
    is_new: formData.is_new || false,
    rating: formData.rating || 0,
    review_count: formData.review_count || 0,
    in_stock: formData.in_stock !== undefined ? formData.in_stock : (safeParseInt(formData.stock_quantity) > 0),
  };

  // Handle fields that differ between create and edit
  if (isEdit) {
    baseData.badge = toNullIfEmpty(formData.badge);
    baseData.brand = toNullIfEmpty(formData.brand);
  } else {
    baseData.badge = formData.badge.trim() || null;
    baseData.brand = formData.brand?.trim() || null;
    // Include UUID for new products if provided
    if (productUuid) {
      baseData.id = productUuid;
    }
  }

  return baseData;
}

