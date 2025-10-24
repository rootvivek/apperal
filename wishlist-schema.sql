-- Wishlist table to store user wishlist items
CREATE TABLE IF NOT EXISTS wishlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique combination of user and product
  UNIQUE(user_id, product_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_product_id ON wishlist(product_id);

-- Enable Row Level Security (RLS)
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
CREATE POLICY "Users can view their own wishlist" ON wishlist
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wishlist items" ON wishlist
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wishlist items" ON wishlist
  FOR DELETE USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_wishlist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_wishlist_updated_at
  BEFORE UPDATE ON wishlist
  FOR EACH ROW
  EXECUTE FUNCTION update_wishlist_updated_at();
