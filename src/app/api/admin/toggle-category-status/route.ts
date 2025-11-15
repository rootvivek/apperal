import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withAdminAuth } from '@/lib/middleware/adminAuth';

async function toggleCategoryStatusHandler(
  request: NextRequest,
  { userId }: { userId: string }
) {
  try {
    const body = await request.json();
    const { categoryId, isActive, isSubcategory } = body;

    if (!categoryId || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'categoryId and isActive (boolean) are required' },
        { status: 400 }
      );
    }

    const tableName = isSubcategory ? 'subcategories' : 'categories';
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from(tableName)
      .update({ is_active: isActive })
      .eq('id', categoryId)
      .select('id, name, is_active')
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to update status' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: `${isSubcategory ? 'Subcategory' : 'Category'} not found` },
        { status: 404 }
      );
    }

    if (data.is_active !== isActive) {
      return NextResponse.json(
        { error: 'Status update failed - value mismatch' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      [isSubcategory ? 'subcategory' : 'category']: data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = withAdminAuth(toggleCategoryStatusHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 30 },
});
