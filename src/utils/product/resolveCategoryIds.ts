import type { Category } from '@/types/admin';

/**
 * Resolves category and subcategory IDs from their names
 * @param categoryName - The name of the category
 * @param subcategoryName - The name of the subcategory (optional, can be first from array)
 * @param categories - Array of all categories
 * @param subcategories - Array of all subcategories
 * @returns Object with categoryId and subcategoryId
 */
export function resolveCategoryIds(
  categoryName: string,
  subcategoryName: string | string[] | null | undefined,
  categories: Category[],
  subcategories: Category[]
): { categoryId: string | null; subcategoryId: string | null } {
  const categoryId = categories.find(c => c.name === categoryName)?.id || null;
  
  // Handle subcategory name - can be string, array, or null
  const selectedSubcategoryName = Array.isArray(subcategoryName)
    ? (subcategoryName.length > 0 ? subcategoryName[0] : null)
    : subcategoryName;
  
  const subcategoryId = selectedSubcategoryName
    ? (subcategories.find(s => s.name === selectedSubcategoryName)?.id || null)
    : null;
  
  return { categoryId, subcategoryId };
}

/**
 * Gets a category by name
 * @param categoryName - The name of the category
 * @param categories - Array of all categories
 * @returns The category object or undefined
 */
export function getCategoryByName(
  categoryName: string,
  categories: Category[]
): Category | undefined {
  return categories.find(c => c.name === categoryName);
}

