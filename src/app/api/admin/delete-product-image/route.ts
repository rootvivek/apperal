import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withAdminAuth } from '@/lib/middleware/adminAuth';
import { z } from 'zod';

const deleteProductImageSchema = z.object({
  imageId: z.string().uuid(),
  imageUrl: z.string().url().optional(), // Optional: for storage deletion
});

async function deleteProductImageHandler(request: NextRequest, { userId: adminUserId }: { userId: string }) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = deleteProductImageSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { imageId, imageUrl } = validation.data;

    // Use service role client to bypass RLS
    const supabaseAdmin = createServerClient();

    // Delete image from database
    const { data: deletedData, error: deleteError } = await supabaseAdmin
      .from('product_images')
      .delete()
      .eq('id', imageId)
      .select('id');

    if (deleteError) {
      return NextResponse.json(
        { error: `Failed to delete image: ${deleteError.message}` },
        { status: 500 }
      );
    }

    if (!deletedData || deletedData.length === 0) {
      return NextResponse.json(
        { error: 'Image not found or already deleted' },
        { status: 404 }
      );
    }

    // Delete image from storage if URL is provided
    if (imageUrl) {
      try {
        // Extract file path from URL
        const urlParts = imageUrl.split('/product-images/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1].split('?')[0]; // Remove query params
          const { error: storageError } = await supabaseAdmin.storage
            .from('product-images')
            .remove([filePath]);

          if (storageError) {
            // Don't fail the request if storage deletion fails - DB deletion succeeded
          }
        }
      } catch (storageErr) {
        // Continue - DB deletion succeeded
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Image deleted successfully'
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete image' },
      { status: 500 }
    );
  }
}

export const POST = withAdminAuth(deleteProductImageHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 30 },
});
