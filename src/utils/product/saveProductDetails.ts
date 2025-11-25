import { createClient } from '@/lib/supabase/client';
import { toNullIfEmpty, toEmptyIfEmpty } from '@/utils/formUtils';
import type { ExtendedProductFormData } from '@/hooks/admin/useProductForm';

interface SaveProductDetailsParams {
  productId: string;
  detailType: 'mobile' | 'apparel' | 'accessories';
  formData: ExtendedProductFormData;
  selectedSizes?: string[];
  selectedFitTypes?: string[];
  isEdit?: boolean;
}

/**
 * Saves product detail records (mobile, apparel, or accessories) to the database
 * Uses upsert logic: checks if record exists, updates if found, inserts if not
 */
export async function saveProductDetails({
  productId,
  detailType,
  formData,
  selectedSizes = [],
  selectedFitTypes = [],
  isEdit = false,
}: SaveProductDetailsParams): Promise<void> {
  const supabase = createClient();
  
  let tableName: string;
  let detailData: Record<string, any>;
  let errorPrefix: string;

  // Prepare data based on detail type
  if (detailType === 'mobile') {
    tableName = 'product_cover_details';
    errorPrefix = 'cover';
    detailData = {
      product_id: productId,
      brand: formData.mobileDetails?.brand?.trim() || 'Not Specified',
      compatible_model: toNullIfEmpty(formData.mobileDetails?.compatible_model),
      type: toNullIfEmpty(formData.mobileDetails?.type),
      color: toNullIfEmpty(formData.mobileDetails?.color),
    };
  } else if (detailType === 'apparel') {
    tableName = 'product_apparel_details';
    errorPrefix = 'apparel';
    detailData = {
      product_id: productId,
      brand: formData.apparelDetails?.brand || 'Not Specified',
      material: toNullIfEmpty(formData.apparelDetails?.material),
      fit_type: selectedFitTypes.length > 0 ? selectedFitTypes.join(',') : null,
      pattern: toNullIfEmpty(formData.apparelDetails?.pattern),
      color: toNullIfEmpty(formData.apparelDetails?.color),
      size: selectedSizes.length > 0 ? selectedSizes.join(',') : null,
      sku: toNullIfEmpty(formData.apparelDetails?.sku),
    };
  } else {
    // accessories
    tableName = 'product_accessories_details';
    errorPrefix = 'accessories';
    detailData = {
      product_id: productId,
      accessory_type: toEmptyIfEmpty(formData.accessoriesDetails?.accessory_type),
      compatible_with: toEmptyIfEmpty(formData.accessoriesDetails?.compatible_with),
      material: toEmptyIfEmpty(formData.accessoriesDetails?.material),
      color: toEmptyIfEmpty(formData.accessoriesDetails?.color),
    };
  }

  // Check if record exists
  const queryMethod = isEdit ? 'maybeSingle' : 'single';
  const { data: existingData, error: checkError } = await supabase
    .from(tableName)
    .select('id')
    .eq('product_id', productId)
    [queryMethod]();

  // Handle errors for edit mode
  if (isEdit && checkError && !checkError.message.includes('JSON object requested, multiple')) {
    throw new Error(`Failed to check ${errorPrefix} details: ${checkError.message}`);
  }

  const existing = existingData || null;

  if (existing && existing.id) {
    // Update existing record
    const { error: updateError } = await supabase
      .from(tableName)
      .update(detailData)
      .eq('id', existing.id);
    
    if (updateError) {
      if (isEdit) {
        throw new Error(`Failed to update ${errorPrefix} details: ${updateError.message}`);
      }
      // For new products, silently fail (less strict error handling)
    }
  } else {
    // Insert new record
    const { error: insertError } = await supabase
      .from(tableName)
      .insert(detailData)
      .select();
    
    if (insertError) {
      if (isEdit) {
        throw new Error(`Failed to insert ${errorPrefix} details: ${insertError.message}`);
      }
      // For new products, silently fail (less strict error handling)
    }
  }
}

