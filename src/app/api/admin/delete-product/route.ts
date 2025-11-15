import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withAdminAuth } from '@/lib/middleware/adminAuth';
import { z } from 'zod';

const deleteProductSchema = z.object({
  productId: z.string().uuid(),
});

async function deleteProductHandler(request: NextRequest, { userId: adminUserId }: { userId: string }) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = deleteProductSchema.safeParse(body);
    if (!validation.success) {
      const errorMessage = process.env.NODE_ENV === 'production'
        ? 'Invalid request data'
        : `Invalid request data: ${validation.error.issues.map(i => i.message).join(', ')}`;
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    const { productId } = validation.data;

    // Use service role client to bypass RLS
    const supabaseAdmin = createServerClient();

    // Step 1: Get product images from database to find actual storage folder
    const { data: productImages, error: imagesFetchError } = await supabaseAdmin
      .from('product_images')
      .select('image_url')
      .eq('product_id', productId);

    // Step 2: Delete product images from storage
    // Extract actual folder from image URLs (may differ from productId)
    if (!imagesFetchError && productImages && productImages.length > 0) {
      try {
        // Extract folder from first image URL
        const firstImageUrl = productImages[0]?.image_url;
        if (firstImageUrl) {
          const urlMatch = firstImageUrl.match(/\/product-images\/([a-f0-9-]{36})\//i);
          const actualFolder = urlMatch?.[1] || productId;
          
          // List all files in the actual folder
          const { data: files, error: listError } = await supabaseAdmin.storage
            .from('product-images')
            .list(actualFolder);

          if (!listError && files && files.length > 0) {
            const filePaths = files.map(file => `${actualFolder}/${file.name}`);
            const { error: storageDeleteError } = await supabaseAdmin.storage
              .from('product-images')
              .remove(filePaths);

            if (storageDeleteError) {
              // Storage deletion failed, but continue with database deletion
            }
          }
        } else {
          // Fallback: Try productId folder if URL extraction fails
          const { data: files, error: listError } = await supabaseAdmin.storage
            .from('product-images')
            .list(productId);

          if (!listError && files && files.length > 0) {
            const filePaths = files.map(file => `${productId}/${file.name}`);
            const { error: storageDeleteError } = await supabaseAdmin.storage
              .from('product-images')
              .remove(filePaths);

            // Storage deletion attempted
          }
        }
      } catch (storageErr: any) {
        // Continue with database deletion even if storage deletion fails
      }
    }

    // Step 3: Delete product images from database
    const { error: imagesError } = await supabaseAdmin
      .from('product_images')
      .delete()
      .eq('product_id', productId);

    if (imagesError) {
      return NextResponse.json(
        { error: `Failed to delete product images: ${imagesError.message}` },
        { status: 500 }
      );
    }

    // Step 3: Delete product detail records
    const detailTables = [
      'product_mobile_details',
      'product_apparel_details',
      'product_accessories_details'
    ];

    for (const table of detailTables) {
      try {
        const { error: detailError } = await supabaseAdmin
          .from(table)
          .delete()
          .eq('product_id', productId);

        if (detailError && !detailError.message.includes('does not exist')) {
          // Error deleting from detail table, continue
        }
      } catch (e: any) {
        // Table might not exist, continue
      }
    }

    // Step 4: Delete related data (reviews, wishlist, cart items)
    try {
      // Delete reviews
      const { error: reviewsError } = await supabaseAdmin
        .from('reviews')
        .delete()
        .eq('product_id', productId);
      if (reviewsError) {
        // Error deleting reviews, continue
      }
    } catch (e) {
      // Reviews table might not exist, continue
    }

    try {
      // Delete wishlist items
      const { error: wishlistError } = await supabaseAdmin
        .from('wishlist')
        .delete()
        .eq('product_id', productId);
      if (wishlistError) {
        // Error deleting wishlist items, continue
      }
    } catch (e) {
      // Wishlist table might not exist, continue
    }

    try {
      // Delete cart items (need to get cart IDs first)
      const { data: carts } = await supabaseAdmin
        .from('carts')
        .select('id');
      
      if (carts && carts.length > 0) {
        const cartIds = carts.map(c => c.id);
        const { error: cartItemsError } = await supabaseAdmin
          .from('cart_items')
          .delete()
          .eq('product_id', productId)
          .in('cart_id', cartIds);
        if (cartItemsError) {
          // Error deleting cart items, continue
        }
      }
    } catch (e) {
      // Cart items deletion skipped
    }

    // Step 5: Delete the product itself
    const { error: deleteError } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', productId);

    if (deleteError) {
      return NextResponse.json(
        { error: `Failed to delete product: ${deleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Product and all related data deleted successfully'
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete product' },
      { status: 500 }
    );
  }
}

export const POST = withAdminAuth(deleteProductHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 10 },
  requireCSRF: true
});

