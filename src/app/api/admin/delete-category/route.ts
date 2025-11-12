import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withAdminAuth } from '@/lib/middleware/adminAuth';
import { z } from 'zod';

const deleteCategorySchema = z.object({
  categoryId: z.string().uuid(),
});

async function deleteCategoryHandler(request: NextRequest, { userId: adminUserId }: { userId: string }) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = deleteCategorySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { categoryId } = validation.data;

    // Use service role client to bypass RLS
    const supabaseAdmin = createServerClient();

    // Step 1: Verify category exists first
    const { data: existingCategory, error: checkError } = await supabaseAdmin
      .from('categories')
      .select('id, name, parent_category_id')
      .eq('id', categoryId)
      .maybeSingle();

    if (checkError) {
      return NextResponse.json(
        { error: `Failed to check category: ${checkError.message}` },
        { status: 500 }
      );
    }

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Step 2: Get all subcategories under this category
    const { data: subcategories, error: subcategoriesError } = await supabaseAdmin
      .from('subcategories')
      .select('id')
      .eq('parent_category_id', categoryId);

    // Step 3: Delete all products under subcategories and the subcategories themselves
    if (subcategories && subcategories.length > 0) {
      for (const subcat of subcategories) {
        try {
          // Get products under this subcategory
          const { data: products } = await supabaseAdmin
            .from('products')
            .select('id')
            .eq('subcategory_id', subcat.id);

          // Delete product images from storage and database
          if (products && products.length > 0) {
            for (const product of products) {
              try {
                // Get product images
                const { data: productImages } = await supabaseAdmin
                  .from('product_images')
                  .select('image_url')
                  .eq('product_id', product.id);

                // Delete product images from storage
                if (productImages && productImages.length > 0) {
                  const firstImageUrl = productImages[0]?.image_url;
                  if (firstImageUrl) {
                    const urlMatch = firstImageUrl.match(/\/product-images\/([a-f0-9-]{36})\//i);
                    const actualFolder = urlMatch?.[1] || product.id;
                    
                    const { data: files } = await supabaseAdmin.storage
                      .from('product-images')
                      .list(actualFolder);

                    if (files && files.length > 0) {
                      const filePaths = files.map(file => `${actualFolder}/${file.name}`);
                      await supabaseAdmin.storage
                        .from('product-images')
                        .remove(filePaths);
                    }
                  }
                }

                // Delete product images from database
                await supabaseAdmin
                  .from('product_images')
                  .delete()
                  .eq('product_id', product.id);

                // Delete product detail records
                const detailTables = ['product_mobile_details', 'product_apparel_details', 'product_accessories_details'];
                for (const table of detailTables) {
                  try {
                    await supabaseAdmin
                      .from(table)
                      .delete()
                      .eq('product_id', product.id);
                  } catch {}
                }

                // Delete related data
                try {
                  await supabaseAdmin.from('reviews').delete().eq('product_id', product.id);
                } catch {}
                
                try {
                  await supabaseAdmin.from('wishlist').delete().eq('product_id', product.id);
                } catch {}

                try {
                  const { data: carts } = await supabaseAdmin.from('carts').select('id');
                  if (carts && carts.length > 0) {
                    const cartIds = carts.map(c => c.id);
                    await supabaseAdmin
                      .from('cart_items')
                      .delete()
                      .eq('product_id', product.id)
                      .in('cart_id', cartIds);
                  }
                } catch {}

                // Delete the product
                await supabaseAdmin
                  .from('products')
                  .delete()
                  .eq('id', product.id);
              } catch (productErr) {
                // Continue with next product
              }
            }
          }

          // Delete subcategory image from storage
          const { data: subcatData } = await supabaseAdmin
            .from('subcategories')
            .select('image_url')
            .eq('id', subcat.id)
            .maybeSingle();

          if (subcatData?.image_url) {
            try {
              const urlMatch = subcatData.image_url.match(/\/subcategory-images\/([a-f0-9-]{36})\//i);
              if (urlMatch) {
                const folderId = urlMatch[1];
                const { data: files } = await supabaseAdmin.storage
                  .from('subcategory-images')
                  .list(folderId);

                if (files && files.length > 0) {
                  const filePaths = files.map(file => `${folderId}/${file.name}`);
                  await supabaseAdmin.storage
                    .from('subcategory-images')
                    .remove(filePaths);
                }
              }
            } catch {}
          }

          // Delete the subcategory
          await supabaseAdmin
            .from('subcategories')
            .delete()
            .eq('id', subcat.id);
        } catch (subcatErr) {
          // Continue with next subcategory
        }
      }
    }

    // Step 4: Delete products directly under the category (if any)
    try {
      const { data: categoryProducts } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('category_id', categoryId);

      if (categoryProducts && categoryProducts.length > 0) {
        for (const product of categoryProducts) {
          try {
            // Delete product images and related data (same as above)
            const { data: productImages } = await supabaseAdmin
              .from('product_images')
              .select('image_url')
              .eq('product_id', product.id);

            if (productImages && productImages.length > 0) {
              const firstImageUrl = productImages[0]?.image_url;
              if (firstImageUrl) {
                const urlMatch = firstImageUrl.match(/\/product-images\/([a-f0-9-]{36})\//i);
                const actualFolder = urlMatch?.[1] || product.id;
                
                const { data: files } = await supabaseAdmin.storage
                  .from('product-images')
                  .list(actualFolder);

                if (files && files.length > 0) {
                  const filePaths = files.map(file => `${actualFolder}/${file.name}`);
                  await supabaseAdmin.storage
                    .from('product-images')
                    .remove(filePaths);
                }
              }
            }

            await supabaseAdmin
              .from('product_images')
              .delete()
              .eq('product_id', product.id);

            const detailTables = ['product_mobile_details', 'product_apparel_details', 'product_accessories_details'];
            for (const table of detailTables) {
              try {
                await supabaseAdmin
                  .from(table)
                  .delete()
                  .eq('product_id', product.id);
              } catch {}
            }

            try {
              await supabaseAdmin.from('reviews').delete().eq('product_id', product.id);
            } catch {}
            
            try {
              await supabaseAdmin.from('wishlist').delete().eq('product_id', product.id);
            } catch {}

            try {
              const { data: carts } = await supabaseAdmin.from('carts').select('id');
              if (carts && carts.length > 0) {
                const cartIds = carts.map(c => c.id);
                await supabaseAdmin
                  .from('cart_items')
                  .delete()
                  .eq('product_id', product.id)
                  .in('cart_id', cartIds);
              }
            } catch {}

            await supabaseAdmin
              .from('products')
              .delete()
              .eq('id', product.id);
          } catch (productErr) {
            // Continue
          }
        }
      }
    } catch {}

    // Step 5: Delete category image from storage
    const { data: categoryData } = await supabaseAdmin
      .from('categories')
      .select('image_url')
      .eq('id', categoryId)
      .maybeSingle();

    if (categoryData?.image_url) {
      try {
        const urlMatch = categoryData.image_url.match(/\/category-images\/([a-f0-9-]{36})\//i);
        if (urlMatch) {
          const folderId = urlMatch[1];
          const { data: files } = await supabaseAdmin.storage
            .from('category-images')
            .list(folderId);

          if (files && files.length > 0) {
            const filePaths = files.map(file => `${folderId}/${file.name}`);
            await supabaseAdmin.storage
              .from('category-images')
              .remove(filePaths);
          }
        }
      } catch {}
    }

    // Step 6: Delete category (service role bypasses RLS)
    const { error: deleteError } = await supabaseAdmin
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (deleteError) {
      return NextResponse.json(
        { 
          error: `Failed to delete category: ${deleteError.message}`,
          details: deleteError
        },
        { status: 500 }
      );
    }

    // Step 7: Verify deletion was successful
    const { data: verifyDeleted } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('id', categoryId)
      .maybeSingle();

    if (verifyDeleted) {
      return NextResponse.json(
        { 
          error: 'Category still exists after deletion attempt'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Category and all associated subcategories and products deleted successfully'
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete category' },
      { status: 500 }
    );
  }
}

export const POST = withAdminAuth(deleteCategoryHandler);

