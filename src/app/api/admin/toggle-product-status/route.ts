import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withAdminAuth } from '@/lib/middleware/adminAuth';
import { z } from 'zod';

const toggleProductStatusSchema = z.object({
  productId: z.string().uuid(),
  isActive: z.boolean(),
});

async function toggleProductStatusHandler(request: NextRequest, { userId: adminUserId }: { userId: string }) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = toggleProductStatusSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { productId, isActive } = validation.data;

    // Use service role client to bypass RLS
    const supabaseAdmin = createServerClient();

    // Update product status
    const { error: updateError } = await supabaseAdmin
      .from('products')
      .update({ is_active: isActive })
      .eq('id', productId);

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update product status: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Product ${isActive ? 'activated' : 'deactivated'} successfully`
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update product status' },
      { status: 500 }
    );
  }
}

export const POST = withAdminAuth(toggleProductStatusHandler);

