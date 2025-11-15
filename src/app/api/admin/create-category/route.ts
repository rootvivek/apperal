import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withAdminAuth } from '@/lib/middleware/adminAuth';
import { z } from 'zod';

const createCategorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  image_url: z.string().url().optional().nullable(),
  is_active: z.boolean().default(true),
  parent_category_id: z.string().uuid().optional().nullable(),
  detail_type: z.string().optional().nullable(),
});

async function createCategoryHandler(request: NextRequest, { userId: adminUserId }: { userId: string }) {
  try {
    const body = await request.json();
    
    const validation = createCategorySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const categoryData = validation.data;
    const supabaseAdmin = createServerClient();

    // Insert category
    const { data: insertedCategory, error: insertError } = await supabaseAdmin
      .from('categories')
      .insert([categoryData])
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: `Failed to create category: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      category: insertedCategory
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create category' },
      { status: 500 }
    );
  }
}

export const POST = withAdminAuth(createCategoryHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 30 },
});
