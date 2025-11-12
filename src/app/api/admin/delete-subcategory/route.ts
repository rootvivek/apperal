import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withAdminAuth } from '@/lib/middleware/adminAuth';
import { z } from 'zod';

const deleteSubcategorySchema = z.object({
  subcategoryId: z.string().uuid(),
});

async function deleteSubcategoryHandler(request: NextRequest, { userId: adminUserId }: { userId: string }) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = deleteSubcategorySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { subcategoryId } = validation.data;

    // Use service role client to bypass RLS
    const supabaseAdmin = createServerClient();

    // Verify service role key is set
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY not set' },
        { status: 500 }
      );
    }

    // Step 1: Verify subcategory exists first (using service role to bypass RLS)
    const { data: existingSubcategory, error: checkError } = await supabaseAdmin
      .from('subcategories')
      .select('id, name')
      .eq('id', subcategoryId)
      .maybeSingle();

    if (checkError) {
      // If RLS error, it means service role isn't working
      if (checkError.message?.includes('row-level security') || checkError.message?.includes('RLS')) {
        return NextResponse.json(
          { 
            error: `RLS policy violation: ${checkError.message}`,
            hint: 'Service role key may not be configured correctly, or RLS policies are blocking even service role access. Check SUPABASE_SERVICE_ROLE_KEY environment variable.'
          },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: `Failed to check subcategory: ${checkError.message}` },
        { status: 500 }
      );
    }

    if (!existingSubcategory) {
      return NextResponse.json(
        { error: 'Subcategory not found' },
        { status: 404 }
      );
    }

    // Step 2: Get all products associated with this subcategory
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('subcategory_id', subcategoryId);

    if (productsError && !productsError.message?.includes('column') && !productsError.message?.includes('does not exist')) {
      // Try legacy subcategory field if subcategory_id doesn't exist
      if (existingSubcategory?.name) {
        const { data: legacyProducts } = await supabaseAdmin
          .from('products')
          .select('id')
          .eq('subcategory', existingSubcategory.name);
        
        if (legacyProducts) {
          // Delete each product using the delete-product API logic
          for (const product of legacyProducts) {
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
      }
    } else if (products && products.length > 0) {
      // Delete each product and its associated data
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

    // Step 2: Get subcategory image URL before deletion
    const { data: subcategoryData } = await supabaseAdmin
      .from('subcategories')
      .select('image_url')
      .eq('id', subcategoryId)
      .maybeSingle();

    // Step 3: Delete subcategory image from storage
    if (subcategoryData?.image_url) {
      try {
        // Extract folder ID from URL (format: /subcategory-images/{subcategoryId}/image.webp)
        const urlMatch = subcategoryData.image_url.match(/\/subcategory-images\/([a-f0-9-]{36})\//i);
        if (urlMatch) {
          const folderId = urlMatch[1];
          // List all files in the folder
          const { data: files } = await supabaseAdmin.storage
            .from('subcategory-images')
            .list(folderId);

          if (files && files.length > 0) {
            const filePaths = files.map(file => `${folderId}/${file.name}`);
            await supabaseAdmin.storage
              .from('subcategory-images')
              .remove(filePaths);
          }
        } else {
          // Fallback: Try to extract just the filename if folder structure is different
          const fallbackMatch = subcategoryData.image_url.match(/\/subcategory-images\/([^\/\?]+)/);
          if (fallbackMatch) {
            await supabaseAdmin.storage
              .from('subcategory-images')
              .remove([fallbackMatch[1]]);
          }
        }
      } catch (imgErr) {
        // Continue even if image deletion fails
      }
    }

    // Step 4: Verify subcategory exists before deletion
    const { data: verifySubcategory, error: verifyError } = await supabaseAdmin
      .from('subcategories')
      .select('id')
      .eq('id', subcategoryId)
      .maybeSingle();

    if (verifyError) {
      return NextResponse.json(
        { error: `Failed to verify subcategory: ${verifyError.message}` },
        { status: 500 }
      );
    }

    if (!verifySubcategory) {
      return NextResponse.json(
        { error: 'Subcategory not found' },
        { status: 404 }
      );
    }

    // Step 5: Delete subcategory (service role bypasses RLS)
    const { error: deleteError } = await supabaseAdmin
      .from('subcategories')
      .delete()
      .eq('id', subcategoryId);

    if (deleteError) {
      return NextResponse.json(
        { 
          error: `Failed to delete subcategory: ${deleteError.message}`,
          details: deleteError
        },
        { status: 500 }
      );
    }

    // Step 6: Verify deletion was successful
    const { data: verifyDeleted } = await supabaseAdmin
      .from('subcategories')
      .select('id')
      .eq('id', subcategoryId)
      .maybeSingle();

    if (verifyDeleted) {
      return NextResponse.json(
        { 
          error: 'Subcategory still exists after deletion attempt'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Subcategory and all associated products deleted successfully',
      deletedId: subcategoryId
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete subcategory' },
      { status: 500 }
    );
  }
}

export const POST = withAdminAuth(deleteSubcategoryHandler);

