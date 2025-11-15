import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/adminAuth';
import { createServerClient } from '@/lib/supabase/server';

async function handler(request: NextRequest, { userId }: { userId: string }) {
  try {
    const supabase = createServerClient(); // Uses service role key, bypasses RLS
    
    // Fetch all products (including inactive) - no filter by is_active
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (productsError) {
      const errorMessage = process.env.NODE_ENV === 'production'
        ? 'Failed to fetch products'
        : `Failed to fetch products: ${productsError.message}`;
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }

    return NextResponse.json({
      products: products || [],
    });
  } catch (error: any) {
    const errorMessage = process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : error?.message || 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(handler, {
  rateLimit: { windowMs: 60000, maxRequests: 60 },
});

export const POST = withAdminAuth(handler, {
  rateLimit: { windowMs: 60000, maxRequests: 60 },
});

