-- =============================================
-- Migration: Add Multiple Subcategories Support
-- =============================================

-- Create a junction table for product-subcategory many-to-many relationship
CREATE TABLE IF NOT EXISTS product_subcategories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  subcategory_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(product_id, subcategory_name)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_subcategories_product ON product_subcategories(product_id);
CREATE INDEX IF NOT EXISTS idx_product_subcategories_subcategory ON product_subcategories(subcategory_name);

-- Migrate existing subcategory data to the new table
INSERT INTO product_subcategories (product_id, subcategory_name)
SELECT id, subcategory
FROM products 
WHERE subcategory IS NOT NULL AND subcategory != '';

-- Create a function to get subcategories as an array for a product
CREATE OR REPLACE FUNCTION get_product_subcategories(product_uuid UUID)
RETURNS TEXT[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT subcategory_name 
    FROM product_subcategories 
    WHERE product_id = product_uuid
    ORDER BY created_at
  );
END;
$$ LANGUAGE plpgsql;

-- Create a view that includes subcategories as an array
CREATE OR REPLACE VIEW products_with_subcategories AS
SELECT 
  p.*,
  get_product_subcategories(p.id) as subcategories
FROM products p;

-- Enable RLS on the new table
ALTER TABLE product_subcategories ENABLE ROW LEVEL SECURITY;

-- Allow public read access to product subcategories
CREATE POLICY "Public can view product subcategories" ON product_subcategories
  FOR SELECT USING (true);

-- Allow authenticated users to manage product subcategories
CREATE POLICY "Authenticated users can manage product subcategories" ON product_subcategories
  FOR ALL USING (auth.role() = 'authenticated');

-- Grant access to the view
GRANT SELECT ON products_with_subcategories TO authenticated;
GRANT SELECT ON products_with_subcategories TO anon;

-- Create helper functions for managing subcategories
CREATE OR REPLACE FUNCTION add_product_subcategory(
  product_uuid UUID,
  subcategory_text VARCHAR(255)
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO product_subcategories (product_id, subcategory_name)
  VALUES (product_uuid, subcategory_text)
  ON CONFLICT (product_id, subcategory_name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION remove_product_subcategory(
  product_uuid UUID,
  subcategory_text VARCHAR(255)
)
RETURNS VOID AS $$
BEGIN
  DELETE FROM product_subcategories 
  WHERE product_id = product_uuid AND subcategory_name = subcategory_text;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_product_subcategories(
  product_uuid UUID,
  subcategory_list TEXT[]
)
RETURNS VOID AS $$
BEGIN
  -- Remove existing subcategories
  DELETE FROM product_subcategories WHERE product_id = product_uuid;
  
  -- Add new subcategories
  IF subcategory_list IS NOT NULL THEN
    INSERT INTO product_subcategories (product_id, subcategory_name)
    SELECT product_uuid, unnest(subcategory_list)
    WHERE unnest(subcategory_list) != '';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION add_product_subcategory(UUID, VARCHAR(255)) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_product_subcategory(UUID, VARCHAR(255)) TO authenticated;
GRANT EXECUTE ON FUNCTION set_product_subcategories(UUID, TEXT[]) TO authenticated;
