import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch wishlist items for the user
    const { data: wishlistData, error } = await supabase
      .from('wishlist')
      .select(`
        id,
        product_id,
        products (
          id,
          name,
          slug,
          description,
          price,
          category_id,
          brand,
          in_stock,
          stock_quantity,
          rating,
          review_count,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch wishlist' }, { status: 500 });
    }

    const products = wishlistData?.map(item => item.products).filter(Boolean) || [];
    const response = NextResponse.json({ wishlist: products });
    // Cache user-specific data for 30 seconds
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productId } = await request.json();

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Add item to wishlist
    const { error } = await supabase
      .from('wishlist')
      .insert({
        user_id: user.id,
        product_id: productId
      });

    if (error) {
      if ((error as any).code === '23505') {
        // Unique constraint violation - item already in wishlist
        return NextResponse.json({ error: 'Item already in wishlist' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to add to wishlist' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Remove item from wishlist
    const { error } = await supabase
      .from('wishlist')
      .delete()
      .eq('user_id', user.id)
      .eq('product_id', productId);

    if (error) {
      return NextResponse.json({ error: 'Failed to remove from wishlist' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
