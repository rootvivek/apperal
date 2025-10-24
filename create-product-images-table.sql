-- =============================================
-- CREATE PRODUCT IMAGES TABLE
-- =============================================
-- This script creates the product_images table for storing multiple images per product

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the product_images table
CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text VARCHAR(255),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);

-- Enable Row Level Security
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Create policies for the product_images table
CREATE POLICY "Anyone can view product images" ON product_images FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert product images" ON product_images FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update product images" ON product_images FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete product images" ON product_images FOR DELETE USING (auth.role() = 'authenticated');

-- Grant necessary permissions
GRANT ALL ON product_images TO authenticated;
GRANT ALL ON product_images TO service_role;
