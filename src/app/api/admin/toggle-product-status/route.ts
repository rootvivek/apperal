import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withAdminAuth } from '@/lib/middleware/adminAuth';

/**
 * Toggle product status (active/inactive)
 */
async function toggleProductStatusHandler(
  request: NextRequest,
  { userId }: { userId: string }
) {
  try {
    const body = await request.json();
    const { productId, isActive } = body;

    if (!productId || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'productId and isActive (boolean) are required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('products')
      .update({ is_active: isActive })
      .eq('id', productId)
      .select('id, name, is_active')
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to update product status' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Verify the update actually worked
    if (data.is_active !== isActive) {
      return NextResponse.json(
        { error: 'Status update failed - value mismatch' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      product: data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = withAdminAuth(toggleProductStatusHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 30 },
});
