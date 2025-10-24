-- Simple wishlist table creation
CREATE TABLE IF NOT EXISTS wishlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique combination of user and product
  UNIQUE(user_id, product_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON wishlist(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
CREATE POLICY "Users can view their own wishlist" ON wishlist
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wishlist items" ON wishlist
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wishlist items" ON wishlist
  FOR DELETE USING (auth.uid() = user_id);
