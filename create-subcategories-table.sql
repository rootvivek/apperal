-- =============================================
-- Create Subcategories Table with Parent-Child Relationship
-- =============================================

-- Step 1: Create subcategories table
CREATE TABLE IF NOT EXISTS subcategories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  
  -- Parent-child relationship using UUID
  parent_category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure unique slug and prevent same subcategory under same parent
  UNIQUE(parent_category_id, slug)
);

-- Step 2: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_subcategories_slug ON subcategories(slug);
CREATE INDEX IF NOT EXISTS idx_subcategories_parent ON subcategories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_name ON subcategories(name);

-- Step 3: Add comment to table
COMMENT ON TABLE subcategories IS 'Subcategories linked to parent categories via UUID foreign key';

-- Step 4: Enable Row Level Security (RLS)
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies
-- Allow anyone to view subcategories
CREATE POLICY "Anyone can view subcategories" 
ON subcategories FOR SELECT 
USING (true);

-- Allow authenticated users to manage subcategories
CREATE POLICY "Authenticated users can insert subcategories" 
ON subcategories FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update subcategories" 
ON subcategories FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete subcategories" 
ON subcategories FOR DELETE 
TO authenticated
USING (true);

-- Step 6: Create trigger for updated_at
CREATE TRIGGER update_subcategories_updated_at 
BEFORE UPDATE ON subcategories 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Step 7: Verify table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'subcategories' 
ORDER BY ordinal_position;

-- Step 8: Show foreign key relationship
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'subcategories';


-- Step 10: Query example to view subcategories with parent names
SELECT 
    s.id,
    s.name,
    s.slug,
    s.description,
    c.name AS parent_category,
    s.image_url,
    s.created_at
FROM subcategories s
JOIN categories c ON s.parent_category_id = c.id
ORDER BY c.name, s.name;

