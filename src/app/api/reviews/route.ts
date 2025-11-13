import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createServerAuthClient } from '@/lib/supabase/server-auth';

// GET - Fetch reviews for a product
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Fetch reviews
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reviews:', error);
      return NextResponse.json(
        { error: 'Failed to fetch reviews' },
        { status: 500 }
      );
    }

    // Fetch user profiles for all unique user IDs
    const userIds = reviews ? [...new Set(reviews.map((r: any) => r.user_id))] : [];
    let userProfilesMap: Record<string, any> = {};

    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, full_name, first_name, last_name, phone')
        .in('id', userIds);

      if (!profilesError && profiles) {
        // Create a map for quick lookup
        profiles.forEach((profile: any) => {
          userProfilesMap[profile.id] = profile;
        });
      }
    }

    // Combine reviews with user profiles
    const reviewsWithProfiles = reviews
      ? reviews.map((review: any) => ({
          ...review,
          user_profiles: userProfilesMap[review.user_id] || null,
        }))
      : [];

    return NextResponse.json({ reviews: reviewsWithProfiles });
  } catch (error) {
    console.error('Error in GET /api/reviews:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Submit a review/rating
export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid request body. Please ensure all required fields are provided.' },
        { status: 400 }
      );
    }
    
    const { productId, rating, comment, userId } = body;

    // Get user ID from request body (Firebase auth) or try Supabase auth
    let user_id: string | null = null;
    
    if (userId) {
      // Firebase user ID from request body
      user_id = userId;
    } else {
      // Try Supabase auth (for Supabase users)
      try {
        const supabaseAuth = await createServerAuthClient(request);
        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
        if (!authError && user) {
          user_id = user.id;
        }
      } catch (error) {
        // Ignore Supabase auth errors - user might be using Firebase
      }
    }
    
    if (!user_id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to submit a review.' },
        { status: 401 }
      );
    }

    // Use service role client for database operations (bypasses RLS)
    const supabase = createServerClient();

    // Validate input
    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Check if user already reviewed this product
    const { data: existingReview, error: checkError } = await supabase
      .from('reviews')
      .select('id')
      .eq('product_id', productId)
      .eq('user_id', user_id)
      .maybeSingle();
    
    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is expected for new reviews
      console.error('Error checking existing review:', checkError);
      // If table doesn't exist, return helpful error
      if (checkError.code === '42P01' || checkError.message?.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Reviews table does not exist. Please run the database migration script.', details: checkError.message },
          { status: 500 }
        );
      }
    }

    let reviewData;
    if (existingReview) {
      // Update existing review
      const { data, error } = await supabase
        .from('reviews')
        .update({
          rating,
          comment: comment || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingReview.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating review:', error);
        return NextResponse.json(
          { error: 'Failed to update review' },
          { status: 500 }
        );
      }
      reviewData = data;
    } else {
      // Create new review
      const { data, error } = await supabase
        .from('reviews')
        .insert({
          product_id: productId,
          user_id: user_id,
          rating,
          comment: comment || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating review:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          user_id: user_id,
          product_id: productId
        });
        
        // Check if table doesn't exist
        if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('relation') || error.message?.includes('table')) {
          return NextResponse.json(
            { error: 'Reviews table does not exist. Please run the database migration script (create-reviews-table.sql) in your Supabase SQL editor.', details: error.message },
            { status: 500 }
          );
        }
        
        // Check if it's a foreign key constraint error
        if (error.code === '23503' || error.message?.includes('foreign key') || error.message?.includes('constraint') || error.message?.includes('violates foreign key')) {
          return NextResponse.json(
            { error: 'Failed to create review. The foreign key constraint is blocking the insert. Please run the migration script to remove it. Error: ' + error.message, details: error.message },
            { status: 500 }
          );
        }
        
        // Check if it's a unique constraint violation (user already reviewed)
        if (error.code === '23505' || error.message?.includes('unique') || error.message?.includes('duplicate')) {
          // This shouldn't happen since we check for existing review, but handle it anyway
          return NextResponse.json(
            { error: 'You have already reviewed this product. Please update your existing review instead.', details: error.message },
            { status: 409 }
          );
        }
        
        return NextResponse.json(
          { error: 'Failed to create review', details: error.message, code: error.code },
          { status: 500 }
        );
      }
      reviewData = data;
    }

    // Calculate and update product's average rating and review count
    const { data: allReviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('product_id', productId);

    if (allReviews && allReviews.length > 0) {
      const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
      const averageRating = totalRating / allReviews.length;
      const reviewCount = allReviews.length;

      // Update product's rating and review_count
      await supabase
        .from('products')
        .update({
          rating: Math.round(averageRating * 100) / 100, // Round to 2 decimal places
          review_count: reviewCount,
        })
        .eq('id', productId);
    }

    return NextResponse.json({ 
      success: true, 
      review: reviewData,
      message: existingReview ? 'Review updated successfully' : 'Review submitted successfully'
    });
  } catch (error) {
    console.error('Error in POST /api/reviews:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a review
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reviewId = searchParams.get('reviewId');
    const productId = searchParams.get('productId');
    const userId = searchParams.get('userId');

    // Get user ID from query params (Firebase auth) or try Supabase auth
    let user_id: string | null = null;
    
    if (userId) {
      // Firebase user ID from query params
      user_id = userId;
    } else {
      // Try Supabase auth (for Supabase users)
      try {
        const supabaseAuth = await createServerAuthClient(request);
        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
        if (!authError && user) {
          user_id = user.id;
        }
      } catch (error) {
        // Ignore Supabase auth errors - user might be using Firebase
      }
    }
    
    if (!user_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use service role client for database operations (bypasses RLS)
    const supabase = createServerClient();

    if (!reviewId || !productId) {
      return NextResponse.json(
        { error: 'Review ID and Product ID are required' },
        { status: 400 }
      );
    }

    // Delete review (only if it belongs to the user)
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId)
      .eq('user_id', user_id);

    if (error) {
      console.error('Error deleting review:', error);
      return NextResponse.json(
        { error: 'Failed to delete review' },
        { status: 500 }
      );
    }

    // Recalculate product's average rating and review count
    const { data: allReviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('product_id', productId);

    const averageRating = allReviews && allReviews.length > 0
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
      : 0;
    const reviewCount = allReviews?.length || 0;

    // Update product's rating and review_count
    await supabase
      .from('products')
      .update({
        rating: Math.round(averageRating * 100) / 100,
        review_count: reviewCount,
      })
      .eq('id', productId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/reviews:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

