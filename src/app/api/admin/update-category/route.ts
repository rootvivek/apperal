import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withAdminAuth } from '@/lib/middleware/adminAuth';
import { z } from 'zod';

const updateCategorySchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  image_url: z.string().url().optional().nullable(),
  is_active: z.boolean().optional(),
  detail_type: z.string().optional().nullable(),
});

async function updateCategoryHandler(request: NextRequest, { userId: adminUserId }: { userId: string }) {
  try {
    const body = await request.json();
    
    const validation = updateCategorySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { categoryId, ...updateData } = validation.data;
    const supabaseAdmin = createServerClient();

    // Update category
    const { data: updatedCategory, error: updateError } = await supabaseAdmin
      .from('categories')
      .update(updateData)
      .eq('id', categoryId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update category: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      category: updatedCategory
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update category' },
      { status: 500 }
    );
  }
}

export const POST = withAdminAuth(updateCategoryHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 30 },
});
