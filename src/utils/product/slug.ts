import { createClient } from '@/lib/supabase/client';
import { SLUG_SETTINGS } from '@/constants';

/**
 * Generates a simple slug from a name (without uniqueness check)
 * @param name - Name to convert to slug
 * @returns Slug string (e.g., "category-name")
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, SLUG_SETTINGS.MAX_LENGTH);
}

/**
 * Generates a unique slug from a product name
 * @param name - Product name
 * @returns Unique slug (e.g., "product-name" or "product-name-2" if duplicate)
 */
export async function generateUniqueSlug(name: string): Promise<string> {
  const supabase = createClient();
  
  const baseSlug = generateSlug(name);
  
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    
    if (error || !data) {
      return slug;
    }
    
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}
