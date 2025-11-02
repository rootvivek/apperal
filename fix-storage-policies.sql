-- =============================================
-- Fix Supabase Storage Bucket Policies
-- This allows authenticated users to upload/delete images
-- =============================================

-- Step 1: Create policies for category-images bucket
CREATE POLICY "Allow authenticated users to upload category images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'category-images');

CREATE POLICY "Allow authenticated users to update category images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'category-images')
WITH CHECK (bucket_id = 'category-images');

CREATE POLICY "Allow authenticated users to delete category images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'category-images');

CREATE POLICY "Allow public to view category images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'category-images');

-- Step 2: Create policies for subcategory-images bucket
CREATE POLICY "Allow authenticated users to upload subcategory images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'subcategory-images');

CREATE POLICY "Allow authenticated users to update subcategory images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'subcategory-images')
WITH CHECK (bucket_id = 'subcategory-images');

CREATE POLICY "Allow authenticated users to delete subcategory images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'subcategory-images');

CREATE POLICY "Allow public to view subcategory images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'subcategory-images');

-- Step 3: Create policies for product-images bucket
CREATE POLICY "Allow authenticated users to upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Allow authenticated users to update product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images')
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Allow authenticated users to delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');

CREATE POLICY "Allow public to view product images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Step 4: Verify policies were created
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage'
ORDER BY policyname;

