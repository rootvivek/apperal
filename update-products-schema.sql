-- =============================================
-- Update products schema to use UUID relations
-- =============================================

-- 1) Add foreign key columns (nullable for backward compatibility)
ALTER TABLE IF EXISTS products
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES subcategories(id) ON DELETE SET NULL;

-- 2) Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_subcategory_id ON products(subcategory_id);

-- 3) Optional backfill example (uncomment and adapt if you want to migrate existing rows)
-- UPDATE products p
-- SET category_id = c.id
-- FROM categories c
-- WHERE p.category_id IS NULL AND p.category = c.name AND c.parent_category_id IS NULL;

-- UPDATE products p
-- SET subcategory_id = s.id
-- FROM subcategories s
-- WHERE p.subcategory_id IS NULL AND p.subcategory = s.name;

-- 4) (Optional) You may decide to drop legacy string columns later
-- ALTER TABLE products DROP COLUMN category;
-- ALTER TABLE products DROP COLUMN subcategory;

-- 5) Notes:
-- - Keep legacy columns during transition for compatibility with existing code
-- - New app writes both UUID FKs and legacy strings
-- - Future cleanup can remove string columns after data is fully migrated


