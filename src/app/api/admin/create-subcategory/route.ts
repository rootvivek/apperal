import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withAdminAuth } from '@/lib/middleware/adminAuth';
import { z } from 'zod';

const createSubcategorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  image_url: z.string().url().optional().nullable(),
  parent_category_id: z.string().uuid(),
  is_active: z.boolean().default(true),
});

async function createSubcategoryHandler(request: NextRequest, { userId: adminUserId }: { userId: string }) {
  try {
    const body = await request.json();
    
    const validation = createSubcategorySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const subcategoryData = validation.data;
    const supabaseAdmin = createServerClient();

    // Insert subcategory
    const { data: insertedSubcategory, error: insertError } = await supabaseAdmin
      .from('subcategories')
      .insert([subcategoryData])
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: `Failed to create subcategory: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      subcategory: insertedSubcategory
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create subcategory' },
      { status: 500 }
    );
  }
}

export const POST = withAdminAuth(createSubcategoryHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 30 },
});
