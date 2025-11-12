import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Type definitions
interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  parent_category_id?: string | null;
  is_active: boolean;
}

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  parent_category_id: string;
  is_active: boolean;
}

interface Product {
  id: string;
  subcategory_id: string;
  name: string;
  slug: string;
  price: number;
  original_price?: number;
  description?: string;
  image_url?: string;
  stock_quantity: number;
  is_active: boolean;
  show_in_hero: boolean;
  badge?: string;
}

interface MobileDetails {
  id: string;
  product_id: string;
  brand: string;
  ram: string;
  storage: string;
  battery: string;
  camera: string;
  display: string;
  os: string;
}

interface ApparelDetails {
  id: string;
  product_id: string;
  brand?: string;
  material?: string;
  fit_type?: string;
  pattern?: string;
  size?: string;
  color?: string;
  sku?: string;
}

// Helper function to generate slug from name
function generateSlug(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Seed Data will be fetched from environment variables or will be minimal
// If you want to seed data, set these environment variables or modify the functions below

// Seed Functions - All fetch IDs from database
async function getAllCategories(): Promise<Map<string, string>> {
  console.log('Fetching all categories from database...');
  const categoryIdMap = new Map<string, string>();
  
  const { data: categories, error } = await supabase
    .from('categories')
    .select('id, name, slug')
    .is('parent_category_id', null)
    .eq('is_active', true);
  
  if (error) {
    console.error('Error fetching categories:', error);
    return categoryIdMap;
  }
  
  if (!categories || categories.length === 0) {
    console.log('No categories found in database.');
    return categoryIdMap;
  }
  
  for (const category of categories) {
    categoryIdMap.set(category.name, category.id);
    console.log(`✓ Found category: "${category.name}" (ID: ${category.id})`);
  }
  
  return categoryIdMap;
}

async function getAllSubcategories(categoryIdMap: Map<string, string>): Promise<Map<string, string>> {
  console.log('\nFetching all subcategories from database...');
  const subcategoryIdMap = new Map<string, string>();
  
  const { data: subcategories, error } = await supabase
    .from('subcategories')
    .select('id, name, slug, parent_category_id')
    .eq('is_active', true);
  
  if (error) {
    console.error('Error fetching subcategories:', error);
    return subcategoryIdMap;
  }
  
  if (!subcategories || subcategories.length === 0) {
    console.log('No subcategories found in database.');
    return subcategoryIdMap;
  }
  
  for (const subcategory of subcategories) {
    // Get parent category name for logging
    const parentCategory = Array.from(categoryIdMap.entries()).find(
      ([_, id]) => id === subcategory.parent_category_id
    );
    
    subcategoryIdMap.set(subcategory.slug, subcategory.id);
    const parentName = parentCategory ? parentCategory[0] : 'Unknown';
    console.log(`✓ Found subcategory: "${subcategory.name}" (ID: ${subcategory.id}) under "${parentName}"`);
  }
  
  return subcategoryIdMap;
}

async function getAllProducts(subcategoryIdMap: Map<string, string>): Promise<Map<string, string>> {
  console.log('\nFetching all products from database...');
  const productIdMap = new Map<string, string>();
  
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug, subcategory_id')
    .eq('is_active', true);
  
  if (error) {
    console.error('Error fetching products:', error);
    return productIdMap;
  }
  
  if (!products || products.length === 0) {
    console.log('No products found in database.');
    return productIdMap;
  }
  
  for (const product of products) {
    // Get subcategory slug for logging
    const subcategory = Array.from(subcategoryIdMap.entries()).find(
      ([_, id]) => id === product.subcategory_id
    );
    
    productIdMap.set(product.slug, product.id);
    const subcategorySlug = subcategory ? subcategory[0] : 'Unknown';
    console.log(`✓ Found product: "${product.name}" (ID: ${product.id}) in "${subcategorySlug}"`);
  }
  
  return productIdMap;
}

async function getAllMobileDetails(productIdMap: Map<string, string>) {
  console.log('\nFetching all mobile details from database...');
  
  const { data: mobileDetails, error } = await supabase
    .from('product_mobile_details')
    .select('*, products!inner(slug, name)');
  
  if (error) {
    console.error('Error fetching mobile details:', error);
    return;
  }
  
  if (!mobileDetails || mobileDetails.length === 0) {
    console.log('No mobile details found in database.');
    return;
  }
  
  for (const details of mobileDetails) {
    const product = details.products as any;
    console.log(`✓ Found mobile details for product: "${product.name}" (${product.slug})`);
  }
}

async function getAllApparelDetails(productIdMap: Map<string, string>) {
  console.log('\nFetching all apparel details from database...');
  
  const { data: apparelDetails, error } = await supabase
    .from('product_apparel_details')
    .select('*, products!inner(slug, name)');
  
  if (error) {
    console.error('Error fetching apparel details:', error);
    return;
  }
  
  if (!apparelDetails || apparelDetails.length === 0) {
    console.log('No apparel details found in database.');
    return;
  }
  
  for (const details of apparelDetails) {
    const product = details.products as any;
    console.log(`✓ Found apparel details for product: "${product.name}" (${product.slug})`);
  }
}

// Query Functions - All fetch dynamically from database
async function fetchMobilesWithDetails(subcategoryIdMap: Map<string, string>) {
  console.log('\n=== Fetching all mobiles with details ===');
  
  // Find all subcategories that have mobile details
  const { data: allSubcategories } = await supabase
    .from('subcategories')
    .select('id, slug')
    .eq('is_active', true);
  
  if (!allSubcategories || allSubcategories.length === 0) {
    console.log('No subcategories found');
    return;
  }
  
  // Get all products with mobile details
  const subcategoryIds = Array.from(subcategoryIdMap.values());
  
  if (subcategoryIds.length === 0) {
    console.log('No subcategories available');
    return;
  }
  
  const { data: allProducts, error } = await supabase
    .from('products')
    .select(`
      *,
      subcategories (
        name,
        slug,
        categories (
          name,
          slug
        )
      ),
      product_mobile_details (*)
    `)
    .in('subcategory_id', subcategoryIds)
    .eq('is_active', true);
  
  // Filter products that have mobile details
  const data = allProducts?.filter((p: any) => {
    const details = Array.isArray(p.product_mobile_details) 
      ? p.product_mobile_details[0] 
      : p.product_mobile_details;
    return details && (Array.isArray(details) ? details.length > 0 : Object.keys(details).length > 0);
  });
  
  if (error) {
    console.error('Error fetching mobiles:', error);
  } else if (!data || data.length === 0) {
    console.log('No products with mobile details found');
  } else {
    console.log(`Found ${data.length} mobile product(s):`, JSON.stringify(data, null, 2));
  }
}

async function fetchApparelWithDetails(subcategoryIdMap: Map<string, string>) {
  console.log('\n=== Fetching all apparel with details ===');
  
  // Get all products with apparel details
  const subcategoryIds = Array.from(subcategoryIdMap.values());
  
  if (subcategoryIds.length === 0) {
    console.log('No subcategories available');
    return;
  }
  
  const { data: allProducts, error } = await supabase
    .from('products')
    .select(`
      *,
      subcategories (
        name,
        slug,
        categories (
          name,
          slug
        )
      ),
      product_apparel_details (*)
    `)
    .in('subcategory_id', subcategoryIds)
    .eq('is_active', true);
  
  // Filter products that have apparel details
  const data = allProducts?.filter((p: any) => {
    const details = Array.isArray(p.product_apparel_details) 
      ? p.product_apparel_details[0] 
      : p.product_apparel_details;
    return details && (Array.isArray(details) ? details.length > 0 : Object.keys(details).length > 0);
  });
  
  if (error) {
    console.error('Error fetching apparel:', error);
  } else if (!data || data.length === 0) {
    console.log('No products with apparel details found');
  } else {
    console.log(`Found ${data.length} apparel product(s):`, JSON.stringify(data, null, 2));
  }
}

async function fetchProductsByCategory(categoryName: string) {
  console.log(`\n=== Fetching products under "${categoryName}" category ===`);
  
  // First, get the category
  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .select('id')
    .eq('name', categoryName)
    .eq('is_active', true)
    .single();
  
  if (categoryError || !category) {
    console.error(`Category "${categoryName}" not found:`, categoryError);
    return;
  }
  
  // Get subcategories for this category
  const { data: subcategories } = await supabase
    .from('subcategories')
    .select('id')
    .eq('parent_category_id', category.id)
    .eq('is_active', true);
  
  if (!subcategories || subcategories.length === 0) {
    console.log(`No subcategories found for "${categoryName}"`);
    return;
  }
  
  const subcategoryIds = subcategories.map(sub => sub.id);
  
  // Get products for these subcategories
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      subcategories (
        name,
        slug,
        categories (
          name,
          slug
        )
      )
    `)
    .in('subcategory_id', subcategoryIds)
    .eq('is_active', true);
  
  if (error) {
    console.error('Error fetching products:', error);
  } else {
    console.log(`Products under "${categoryName}":`, JSON.stringify(data, null, 2));
  }
}

// Main execution - Fetches all data from database, no hardcoded values
async function main() {
  console.log('🚀 Starting database operations...\n');
  console.log('📊 Fetching all data from database (no hardcoded values)\n');
  
  try {
    // Fetch all data from database in order: categories → subcategories → products → details
    const categoryIdMap = await getAllCategories();
    const subcategoryIdMap = await getAllSubcategories(categoryIdMap);
    const productIdMap = await getAllProducts(subcategoryIdMap);
    await getAllMobileDetails(productIdMap);
    await getAllApparelDetails(productIdMap);
    
    console.log('\n✅ Data fetching completed successfully!\n');
    
    // Fetch and display products with their details (using fetched subcategory IDs)
    await fetchMobilesWithDetails(subcategoryIdMap);
    await fetchApparelWithDetails(subcategoryIdMap);
    
    // Fetch products by category (using first category found if available)
    if (categoryIdMap.size > 0) {
      const firstCategory = Array.from(categoryIdMap.keys())[0];
      await fetchProductsByCategory(firstCategory);
    } else {
      console.log('\nNo categories found to fetch products by category.');
    }
    
    console.log('\n✨ All operations completed!');
  } catch (error) {
    console.error('❌ Operation failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { main as seedDatabase };

