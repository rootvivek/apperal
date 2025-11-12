import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withAdminAuth } from '@/lib/middleware/adminAuth';
import { z } from 'zod';

const updateProductSchema = z.object({
  productId: z.string().uuid(),
  product: z.object({
    name: z.string().min(1).optional(),
    slug: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    price: z.number().positive().optional(),
    original_price: z.number().positive().optional().nullable(),
    badge: z.string().optional().nullable(),
    image_url: z.string().url().optional().nullable(),
    stock_quantity: z.number().int().min(0).optional(),
    is_active: z.boolean().optional(),
    show_in_hero: z.boolean().optional(),
    category_id: z.string().uuid().optional().nullable(),
    subcategory_id: z.string().uuid().optional().nullable(),
    brand: z.string().optional().nullable(),
    is_new: z.boolean().optional(),
    rating: z.number().min(0).max(5).optional(),
    review_count: z.number().int().min(0).optional(),
    in_stock: z.boolean().optional(),
  }),
  images: z.array(z.object({
    id: z.string().uuid().optional(), // Existing image ID (if updating)
    image_url: z.string().url(),
    alt_text: z.string().optional(),
    display_order: z.number().int().min(0)
  })).optional(),
});

async function updateProductHandler(request: NextRequest, { userId: adminUserId }: { userId: string }) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = updateProductSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { productId, product, images } = validation.data;

    // Use service role client to bypass RLS
    const supabaseAdmin = createServerClient();

    // Update product
    const { error: updateError } = await supabaseAdmin
      .from('products')
      .update(product)
      .eq('id', productId);

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update product: ${updateError.message}` },
        { status: 500 }
      );
    }

    // Handle images if provided
    if (images !== undefined) {
      // Get existing images for this product (fresh from database)
      const { data: existingImages, error: fetchError } = await supabaseAdmin
        .from('product_images')
        .select('id, image_url, alt_text, display_order')
        .eq('product_id', productId);

      if (fetchError) {
        return NextResponse.json(
          { error: `Failed to fetch existing images: ${fetchError.message}` },
          { status: 500 }
        );
      }

      const existingImagesList = existingImages || [];
      const existingImageIds = new Set(existingImagesList.map(img => img.id));
      const existingImageUrls = new Set(existingImagesList.map(img => img.image_url));
      
      const newImageIds = new Set(images.filter(img => img.id).map(img => img.id!));
      const newImageUrls = new Set(images.map(img => img.image_url));

      // Delete images that were removed:
      // An image should be deleted if it exists in DB but is NOT in the new list
      // Check by both ID and URL to be thorough
      const imagesToDelete = existingImagesList
        .filter(img => {
          // Delete if the image's ID is not in the new list
          // OR if the image's URL is not in the new list
          // This catches all cases: removed images, replaced images, etc.
          return !newImageIds.has(img.id) && !newImageUrls.has(img.image_url);
        })
        .map(img => img.id);

      // CRITICAL: Delete removed images FIRST, before processing updates/inserts
      if (imagesToDelete.length > 0) {
        const { error: deleteImagesError } = await supabaseAdmin
          .from('product_images')
          .delete()
          .in('id', imagesToDelete)
          .select('id');

        if (deleteImagesError) {
          return NextResponse.json(
            { error: `Failed to delete removed images: ${deleteImagesError.message}` },
            { status: 500 }
          );
        }
      }

      // Update existing images or insert new ones
      const imagesToUpdate = images.filter(img => img.id && existingImageIds.has(img.id));
      const imagesToInsert = images.filter(img => !img.id || !existingImageIds.has(img.id));

      // Update existing images (preserves UUIDs)
      for (const image of imagesToUpdate) {
        if (!image.id) continue; // Safety check
        
        const { error: updateError } = await supabaseAdmin
          .from('product_images')
          .update({
            image_url: image.image_url,
            alt_text: image.alt_text || '',
            display_order: image.display_order
          })
          .eq('id', image.id);

        if (updateError) {
          return NextResponse.json(
            { error: `Failed to update image: ${updateError.message}` },
            { status: 500 }
          );
        }
      }

      // Insert new images (no ID or ID doesn't exist)
      if (imagesToInsert.length > 0) {
        const insertData = imagesToInsert.map(image => ({
          product_id: productId,
          image_url: image.image_url,
          alt_text: image.alt_text || '',
          display_order: image.display_order
        }));

        const { error: insertError } = await supabaseAdmin
          .from('product_images')
          .insert(insertData);

        if (insertError) {
          return NextResponse.json(
            { error: `Failed to insert new images: ${insertError.message}` },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Product updated successfully'
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update product' },
      { status: 500 }
    );
  }
}

export const POST = withAdminAuth(updateProductHandler);

