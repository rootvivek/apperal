import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withAdminAuth } from '@/lib/middleware/adminAuth';
import { z } from 'zod';

const insertProductImagesSchema = z.object({
  product_id: z.string().uuid(),
  images: z.array(z.object({
    image_url: z.string().url(),
    alt_text: z.string().optional(),
    display_order: z.number().int().min(0)
  })).min(1)
});

async function insertProductImagesHandler(request: NextRequest, { userId: adminUserId }: { userId: string }) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = insertProductImagesSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { product_id, images } = validation.data;

    // Use service role client to bypass RLS
    const supabaseAdmin = createServerClient();

    // Prepare image inserts
    const imageInserts = images.map(image => ({
      product_id,
      image_url: image.image_url,
      alt_text: image.alt_text || '',
      display_order: image.display_order
    }));

    // Insert product images
    const { data: insertedImages, error: insertError } = await supabaseAdmin
      .from('product_images')
      .insert(imageInserts)
      .select('id, image_url, alt_text, display_order');

    if (insertError) {
      return NextResponse.json(
        { error: `Failed to insert images: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      images: insertedImages
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to insert product images' },
      { status: 500 }
    );
  }
}

export const POST = withAdminAuth(insertProductImagesHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 30 },
});
