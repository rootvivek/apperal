import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/adminAuth';
import { createServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateStockSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(0),
});

// Route to update stock for a single product (admin use)
export async function POST(request: NextRequest) {
  try {
    const handler = async (req: NextRequest, { userId }: { userId: string }) => {
      const body = await req.json();
      const validation = updateStockSchema.safeParse(body);
      
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Invalid request data', details: validation.error.issues },
          { status: 400 }
        );
      }

      const { productId, quantity } = validation.data;
      const supabaseAdmin = createServerClient();

      // Update stock quantity
      const { data, error } = await supabaseAdmin
        .from('products')
        .update({ 
          stock_quantity: quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId)
        .select('id, name, stock_quantity')
        .single();

      if (error) {
        return NextResponse.json(
          { error: 'Failed to update stock', details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ 
        success: true, 
        product: data,
        message: 'Stock updated successfully' 
      });
    };

    return withAdminAuth(handler)(request);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
