-- Fix cart_items table structure
-- First, let's check what columns exist and fix them

-- Drop the existing cart_items table if it has wrong structure
DROP TABLE IF EXISTS cart_items CASCADE;

-- Create cart_items table with correct structure
CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cart_id UUID REFERENCES carts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(cart_id, product_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product ON cart_items(product_id);

-- Enable RLS
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Create policies for cart_items table
CREATE POLICY "Users can view their own cart items" ON cart_items
  FOR SELECT USING (
    cart_id IN (
      SELECT id FROM carts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own cart items" ON cart_items
  FOR INSERT WITH CHECK (
    cart_id IN (
      SELECT id FROM carts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own cart items" ON cart_items
  FOR UPDATE USING (
    cart_id IN (
      SELECT id FROM carts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own cart items" ON cart_items
  FOR DELETE USING (
    cart_id IN (
      SELECT id FROM carts WHERE user_id = auth.uid()
    )
  );
