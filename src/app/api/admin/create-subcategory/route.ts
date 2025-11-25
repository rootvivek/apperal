import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withAdminAuth } from '@/lib/middleware/adminAuth';
import { z } from 'zod';

const createSubcategorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  image_url: z.string().url().optional().nullable().or(z.literal('').transform(() => null)),
  parent_category_id: z.string().uuid(),
  is_active: z.boolean().optional().default(true),
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
      console.error('Error creating subcategory:', insertError);
      console.error('Subcategory data:', subcategoryData);
      
      // Check if table doesn't exist
      if (insertError.code === '42P01' || insertError.message?.includes('does not exist') || insertError.message?.includes('relation')) {
        return NextResponse.json(
          { error: 'Subcategories table does not exist. Please check your database schema.', details: insertError.message },
          { status: 500 }
        );
      }
      
      // Check for foreign key constraint
      if (insertError.code === '23503' || insertError.message?.includes('foreign key')) {
        return NextResponse.json(
          { error: `Invalid parent category. The parent category ID does not exist.`, details: insertError.message },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: `Failed to create subcategory: ${insertError.message}`, details: insertError.details, code: insertError.code },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      subcategory: insertedSubcategory
    });

  } catch (error: any) {
    console.error('Error in create-subcategory handler:', error);
    console.error('Error stack:', error?.stack);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create subcategory',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}

export const POST = withAdminAuth(createSubcategoryHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 30 },
});
