import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withAdminAuth } from '@/lib/middleware/adminAuth';
import { z } from 'zod';

const updateCategoryImageSchema = z.object({
  categoryId: z.string().uuid(),
  imageUrl: z.string().url(),
  isSubcategory: z.boolean().optional().default(false),
});

async function updateCategoryImageHandler(request: NextRequest, { userId: adminUserId }: { userId: string }) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = updateCategoryImageSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { categoryId, imageUrl, isSubcategory } = validation.data;

    // Use service role client to bypass RLS
    const supabaseAdmin = createServerClient();

    // Determine table name
    const tableName = isSubcategory ? 'subcategories' : 'categories';

    // Update category image
    const { error: updateError } = await supabaseAdmin
      .from(tableName)
      .update({ 
        image_url: imageUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', categoryId);

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update category image: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Category image updated successfully'
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update category image' },
      { status: 500 }
    );
  }
}

export const POST = withAdminAuth(updateCategoryImageHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 30 },
});
