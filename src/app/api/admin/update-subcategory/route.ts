import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withAdminAuth } from '@/lib/middleware/adminAuth';
import { z } from 'zod';

const updateSubcategorySchema = z.object({
  subcategoryId: z.string().uuid(),
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  image_url: z.string().url().optional().nullable(),
  parent_category_id: z.string().uuid().optional(),
  is_active: z.boolean().optional(),
});

async function updateSubcategoryHandler(request: NextRequest, { userId: adminUserId }: { userId: string }) {
  try {
    const body = await request.json();
    
    const validation = updateSubcategorySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { subcategoryId, ...updateData } = validation.data;
    const supabaseAdmin = createServerClient();

    // Update subcategory
    const { data: updatedSubcategory, error: updateError } = await supabaseAdmin
      .from('subcategories')
      .update(updateData)
      .eq('id', subcategoryId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update subcategory: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      subcategory: updatedSubcategory
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update subcategory' },
      { status: 500 }
    );
  }
}

export const POST = withAdminAuth(updateSubcategoryHandler);

