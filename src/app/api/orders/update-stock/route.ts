import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

const orderItemsSchema = z.array(z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().positive(),
}));

/**
 * API route to decrement stock when an order is placed
 * This is called internally by order creation flows
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = orderItemsSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid order items data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const orderItems = validation.data;
    const supabaseAdmin = createServerClient();

    // Update stock for each product in the order
    const stockUpdates = await Promise.all(
      orderItems.map(async (item) => {
        // Get current stock
        const { data: product, error: fetchError } = await supabaseAdmin
          .from('products')
          .select('id, name, stock_quantity')
          .eq('id', item.product_id)
          .single();

        if (fetchError || !product) {
          console.error(`Error fetching product ${item.product_id}:`, fetchError);
          return { 
            productId: item.product_id, 
            success: false, 
            error: fetchError?.message || 'Product not found' 
          };
        }

        const currentStock = product.stock_quantity || 0;
        const newStock = Math.max(0, currentStock - item.quantity);

        // Update stock
        const { error: updateError } = await supabaseAdmin
          .from('products')
          .update({ 
            stock_quantity: newStock,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.product_id);

        if (updateError) {
          console.error(`Error updating stock for product ${item.product_id}:`, updateError);
          return { 
            productId: item.product_id, 
            success: false, 
            error: updateError.message 
          };
        }

        return { 
          productId: item.product_id,
          productName: product.name,
          previousStock: currentStock,
          quantityOrdered: item.quantity,
          newStock,
          success: true 
        };
      })
    );

    // Check if any updates failed
    const failedUpdates = stockUpdates.filter(update => !update.success);
    if (failedUpdates.length > 0) {
      return NextResponse.json(
        { 
          error: 'Some stock updates failed',
          failedUpdates,
          successfulUpdates: stockUpdates.filter(update => update.success)
        },
        { status: 207 } // Multi-status
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Stock updated successfully',
      updates: stockUpdates
    });
  } catch (error: any) {
    console.error('Error updating stock:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

