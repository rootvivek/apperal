-- Create ALL Product Detail Tables (Mobile, Apparel, Accessories)
-- This is extensible - you can add more detail tables in the future

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Product Mobile Details Table
CREATE TABLE IF NOT EXISTS product_mobile_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    brand VARCHAR(100) NOT NULL,
    ram VARCHAR(50) NOT NULL,
    storage VARCHAR(50) NOT NULL,
    battery VARCHAR(100) NOT NULL,
    camera VARCHAR(255) NOT NULL,
    display VARCHAR(255) NOT NULL,
    os VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product Apparel Details Table
CREATE TABLE IF NOT EXISTS product_apparel_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    size VARCHAR(50) NOT NULL,
    color VARCHAR(100) NOT NULL,
    fabric VARCHAR(100) NOT NULL,
    gender VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product Accessories Details Table
CREATE TABLE IF NOT EXISTS product_accessories_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    accessory_type VARCHAR(100) NOT NULL,
    compatible_with VARCHAR(255),
    material VARCHAR(100) NOT NULL,
    color VARCHAR(100) NOT NULL,
    dimensions VARCHAR(100),
    weight VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_product_mobile_details_product_id ON product_mobile_details(product_id);
CREATE INDEX IF NOT EXISTS idx_product_apparel_details_product_id ON product_apparel_details(product_id);
CREATE INDEX IF NOT EXISTS idx_product_accessories_details_product_id ON product_accessories_details(product_id);

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update updated_at
DROP TRIGGER IF EXISTS update_product_mobile_details_updated_at ON product_mobile_details;
CREATE TRIGGER update_product_mobile_details_updated_at 
    BEFORE UPDATE ON product_mobile_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_apparel_details_updated_at ON product_apparel_details;
CREATE TRIGGER update_product_apparel_details_updated_at 
    BEFORE UPDATE ON product_apparel_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_accessories_details_updated_at ON product_accessories_details;
CREATE TRIGGER update_product_accessories_details_updated_at 
    BEFORE UPDATE ON product_accessories_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ All product detail tables created successfully!';
    RAISE NOTICE '   - product_mobile_details (for mobile products)';
    RAISE NOTICE '   - product_apparel_details (for apparel products)';
    RAISE NOTICE '   - product_accessories_details (for accessories products)';
    RAISE NOTICE '   - To add more detail tables in the future, follow the same pattern';
END $$;

