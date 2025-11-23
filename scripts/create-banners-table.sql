-- Create banners table
CREATE TABLE IF NOT EXISTS banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_name VARCHAR(100) NOT NULL UNIQUE,
  image_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on section_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_banners_section_name ON banners(section_name);
CREATE INDEX IF NOT EXISTS idx_banners_is_active ON banners(is_active);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_banners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_banners_updated_at
  BEFORE UPDATE ON banners
  FOR EACH ROW
  EXECUTE FUNCTION update_banners_updated_at();

-- Insert default banners for common sections
INSERT INTO banners (section_name, image_url, display_order) VALUES
  ('shop-by-category', '/images/categories/new-arrivals.jpg', 1),
  ('all-products', '/images/categories/best-sellers.jpg', 2),
  ('categories', '/images/categories/featured-products.jpg', 3),
  ('subcategories', '/images/categories/accessories.jpg', 4),
  ('products', '/images/categories/best-sellers.jpg', 5),
  ('wishlist', '/images/categories/premium.jpg', 6)
ON CONFLICT (section_name) DO NOTHING;

