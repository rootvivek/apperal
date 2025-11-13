'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLoginModal } from '@/contexts/LoginModalContext';

interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title?: string | null;
  comment?: string | null;
  is_verified_purchase: boolean;
  created_at: string;
  updated_at: string;
  profiles?: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
  };
  user_profiles?: {
    id: string;
    full_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
  };
}

interface ProductReviewsProps {
  productId: string;
  onRatingUpdate?: (averageRating: number, reviewCount: number) => void;
}

export default function ProductReviews({ productId, onRatingUpdate }: ProductReviewsProps) {
  const { user } = useAuth();
  const { openModal: openLoginModal } = useLoginModal();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [userReview, setUserReview] = useState<Review | null>(null);
  
  // Rating state
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);
  
  // Review form state
  const [comment, setComment] = useState('');

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/reviews?productId=${productId}`);
      const data = await response.json();
      
      if (data.reviews) {
        setReviews(data.reviews);
        
        // Find user's review if logged in
        if (user) {
          const userRev = data.reviews.find((r: Review) => r.user_id === user.id);
          if (userRev) {
            setUserReview(userRev);
            setRating(userRev.rating);
            setComment(userRev.comment || '');
          } else {
            // Check if user has submitted a rating without review
            // We'll need to fetch user's rating separately if needed
          }
        }
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRating = async (selectedRating: number) => {
    if (!user) {
      alert('Please login to submit a rating');
      return;
    }

    try {
      setSubmittingRating(true);
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          rating: selectedRating,
          comment: null,
          userId: user.id,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || `Server error: ${response.status}` };
        }
        const errorMessage = errorData.error || errorData.details || `Failed to submit rating (${response.status})`;
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          fullResponse: errorText
        });
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (data.success) {
        setRating(selectedRating);
        await fetchReviews();
        
        // Notify parent component of rating update
        if (onRatingUpdate) {
          const avgRating = reviews.length > 0
            ? (reviews.reduce((sum, r) => sum + r.rating, 0) + selectedRating) / (reviews.length + (userReview ? 0 : 1))
            : selectedRating;
          onRatingUpdate(avgRating, reviews.length + (userReview ? 0 : 1));
        }
      } else {
        const errorMessage = data.error || data.details || 'Failed to submit rating';
        console.error('Rating submission error:', data);
        alert(errorMessage);
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit rating';
      alert(errorMessage);
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      alert('Please login to submit a review');
      return;
    }

    if (rating === 0) {
      alert('Please submit a rating first');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          rating,
          comment: comment.trim() || null,
          userId: user.id,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || `Server error: ${response.status}` };
        }
        throw new Error(errorData.error || errorData.details || `Failed to submit review (${response.status})`);
      }

      const data = await response.json();

      if (data.success) {
        // Refresh reviews
        await fetchReviews();
        setShowReviewForm(false);
        
        // Notify parent component of rating update
        if (onRatingUpdate) {
          const avgRating = reviews.length > 0
            ? (reviews.reduce((sum, r) => sum + r.rating, 0) + rating) / (reviews.length + (userReview ? 0 : 1))
            : rating;
          onRatingUpdate(avgRating, reviews.length + (userReview ? 0 : 1));
        }
      } else {
        const errorMessage = data.error || data.details || 'Failed to submit review';
        console.error('Review submission error:', data);
        alert(errorMessage);
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit review';
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!userReview || !user) return;
    
    if (!confirm('Are you sure you want to delete your review?')) return;

    try {
      const response = await fetch(
        `/api/reviews?reviewId=${userReview.id}&productId=${productId}&userId=${user.id}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (data.success) {
        setUserReview(null);
        setRating(0);
        setComment('');
        await fetchReviews();
        
        // Notify parent component
        if (onRatingUpdate) {
          const remainingReviews = reviews.filter(r => r.id !== userReview.id);
          const avgRating = remainingReviews.length > 0
            ? remainingReviews.reduce((sum, r) => sum + r.rating, 0) / remainingReviews.length
            : 0;
          onRatingUpdate(avgRating, remainingReviews.length);
        }
      } else {
        alert(data.error || 'Failed to delete review');
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      alert('Failed to delete review');
    }
  };

  const getUserDisplayName = (review: Review) => {
    // Check for user_profiles (new structure) or profiles (old structure)
    const profile = (review as any).user_profiles || review.profiles;
    if (profile) {
      // Try full_name first (user_profiles structure)
      if (profile.full_name) {
        return profile.full_name;
      }
      // Fall back to first_name + last_name
      const firstName = profile.first_name || '';
      const lastName = profile.last_name || '';
      if (firstName || lastName) {
        return `${firstName} ${lastName}`.trim();
      }
      if (profile.phone) {
        return profile.phone.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2');
      }
    }
    return 'Anonymous';
  };

  if (loading) {
    return (
      <div className="mt-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 border-t border-gray-200 pt-8">
      {/* Rating Section - Separate */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Rate this Product</h3>
        
        {user ? (
          <div className="bg-gray-50 rounded-lg p-6">
            {rating > 0 ? (
              <div className="flex items-center gap-4">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleSubmitRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      disabled={submittingRating}
                      className={`text-3xl focus:outline-none transition-transform hover:scale-110 disabled:opacity-50 ${
                        star <= (hoveredRating || rating) ? 'text-yellow-500' : 'text-gray-300'
                      }`}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
                <span className="text-sm text-gray-600">
                  {submittingRating ? 'Saving...' : `You rated this ${rating} star${rating !== 1 ? 's' : ''}`}
                </span>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Your Rating <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleSubmitRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      disabled={submittingRating}
                      className={`text-3xl focus:outline-none transition-transform hover:scale-110 disabled:opacity-50 ${
                        star <= hoveredRating ? 'text-yellow-500' : 'text-gray-300'
                      }`}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
                {submittingRating && (
                  <p className="text-sm text-gray-500 mt-2">Saving rating...</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <button
                onClick={() => openLoginModal()}
                className="text-brand hover:underline font-medium"
              >
                Login
              </button> to rate this product
            </p>
          </div>
        )}
      </div>

      {/* Review Section - Separate */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Customer Reviews</h3>

        {/* Review Form */}
        {user ? (
          <div className="mb-8">
            {!showReviewForm && !userReview ? (
              <button
                onClick={() => {
                  if (rating === 0) {
                    alert('Please rate this product first');
                    return;
                  }
                  setShowReviewForm(true);
                }}
                className="px-4 py-2 bg-brand text-white rounded-md hover:bg-brand-600 transition-colors"
              >
                Write a Review
              </button>
            ) : (
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-900">
                    {userReview ? 'Your Review' : 'Write a Review'}
                  </h4>
                  {userReview && (
                    <button
                      onClick={handleDeleteReview}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Delete Review
                    </button>
                  )}
                </div>

                <form onSubmit={handleSubmitReview} className="space-y-4">
                  {/* Review Comment */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Review (Optional)
                    </label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Share your experience with this product"
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={submitting || rating === 0}
                      className="px-6 py-2 bg-brand text-white rounded-md hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {submitting ? 'Submitting...' : userReview ? 'Update Review' : 'Submit Review'}
                    </button>
                    {showReviewForm && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowReviewForm(false);
                          setComment('');
                        }}
                        className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}
          </div>
        ) : (
          <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <button
                onClick={() => openLoginModal()}
                className="text-brand hover:underline font-medium"
              >
                Login
              </button> to write a review
            </p>
          </div>
        )}

        {/* Reviews List */}
        <div className="space-y-6">
          {reviews.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No reviews yet. Be the first to review this product!</p>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">
                        {getUserDisplayName(review)}
                      </span>
                      {review.is_verified_purchase && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                          Verified Purchase
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex text-yellow-500">
                        {'⭐'.repeat(review.rating)}
                        {'☆'.repeat(5 - review.rating)}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                {review.comment && (
                  <p className="text-gray-700 mt-2">{review.comment}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

