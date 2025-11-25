import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withAdminAuth } from '@/lib/middleware/adminAuth';
import { z } from 'zod';

const createCategorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  image_url: z.string().url().optional().nullable().or(z.literal('').transform(() => null)),
  is_active: z.boolean().optional().default(true),
  parent_category_id: z.string().uuid().optional().nullable(),
  detail_type: z.string().optional().nullable(),
  id: z.string().uuid().optional(), // Allow temp ID for image folder consistency
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
      console.error('Error creating category:', insertError);
      console.error('Category data:', categoryData);
      
      // Check if table doesn't exist
      if (insertError.code === '42P01' || insertError.message?.includes('does not exist') || insertError.message?.includes('relation')) {
        return NextResponse.json(
          { error: 'Categories table does not exist. Please check your database schema.', details: insertError.message },
          { status: 500 }
        );
      }
      
      // Check for unique constraint violation (duplicate slug)
      if (insertError.code === '23505' || insertError.message?.includes('unique') || insertError.message?.includes('duplicate')) {
        return NextResponse.json(
          { error: 'A category with this name or slug already exists. Please use a different name.', details: insertError.message },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: `Failed to create category: ${insertError.message}`, details: insertError.details, code: insertError.code },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      category: insertedCategory
    });

  } catch (error: any) {
    console.error('Error in create-category handler:', error);
    console.error('Error stack:', error?.stack);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create category',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}

export const POST = withAdminAuth(createCategoryHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 30 },
});
