import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withAdminAuth } from '@/lib/middleware/adminAuth';
import { z } from 'zod';

const createProductSchema = z.object({
  product: z.object({
    name: z.string().min(1),
    slug: z.string().min(1),
    description: z.string().optional(),
    price: z.number().positive(),
    original_price: z.number().positive().optional().nullable(),
    badge: z.string().optional().nullable(),
    image_url: z.string().url().optional().nullable(),
    stock_quantity: z.number().int().min(0),
    is_active: z.boolean(),
    show_in_hero: z.boolean(),
    category_id: z.string().uuid().optional().nullable(),
    subcategory_id: z.string().uuid().optional().nullable(),
    brand: z.string().optional().nullable(),
    is_new: z.boolean().optional(),
    rating: z.number().min(0).max(5).optional(),
    review_count: z.number().int().min(0).optional(),
    in_stock: z.boolean().optional(),
  }),
  images: z.array(z.object({
    image_url: z.string().url(),
    alt_text: z.string().optional(),
    display_order: z.number().int().min(0)
  })).optional(),
});

async function createProductHandler(request: NextRequest, { userId: adminUserId }: { userId: string }) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = createProductSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { product, images } = validation.data;

    // Use service role client to bypass RLS
    const supabaseAdmin = createServerClient();

    // Insert product
    const { data: insertedProduct, error: insertError } = await supabaseAdmin
      .from('products')
      .insert([product])
      .select('id')
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: `Failed to create product: ${insertError.message}` },
        { status: 500 }
      );
    }

    // Insert product images if provided
    if (images && images.length > 0 && insertedProduct) {
      const imageInserts = images.map(image => ({
        product_id: insertedProduct.id,
        image_url: image.image_url,
        alt_text: image.alt_text || '',
        display_order: image.display_order
      }));

      const { error: imagesError } = await supabaseAdmin
        .from('product_images')
        .insert(imageInserts);

      if (imagesError) {
        // Don't fail the request if images fail - product was created successfully
      }
    }

    return NextResponse.json({
      success: true,
      product: insertedProduct
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create product' },
      { status: 500 }
    );
  }
}

export const POST = withAdminAuth(createProductHandler);

