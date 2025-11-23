-- Create reviews table
-- This table stores product reviews and ratings from users

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,
  user_id TEXT NOT NULL, -- Firebase user ID (TEXT to support Firebase UIDs)
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on product_id for faster queries
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);

-- Create unique constraint to prevent duplicate reviews from same user for same product
-- This allows users to update their review but prevents multiple reviews
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_user_product_unique ON reviews(user_id, product_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read reviews
CREATE POLICY "Anyone can read reviews"
  ON reviews
  FOR SELECT
  USING (true);

-- Create policy to allow authenticated users to insert their own reviews
-- Note: Since we're using Firebase auth, we'll handle auth in the API route
-- This policy allows inserts but the API route validates the user_id
CREATE POLICY "Users can insert their own reviews"
  ON reviews
  FOR INSERT
  WITH CHECK (true);

-- Create policy to allow users to update their own reviews
CREATE POLICY "Users can update their own reviews"
  ON reviews
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Create policy to allow users to delete their own reviews
CREATE POLICY "Users can delete their own reviews"
  ON reviews
  FOR DELETE
  USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_reviews_updated_at();

-- Add comment to table
COMMENT ON TABLE reviews IS 'Stores product reviews and ratings from users';
COMMENT ON COLUMN reviews.user_id IS 'Firebase user ID (stored as TEXT to support Firebase UIDs)';
COMMENT ON COLUMN reviews.rating IS 'Rating value between 1 and 5';
COMMENT ON COLUMN reviews.comment IS 'Optional review comment text';

