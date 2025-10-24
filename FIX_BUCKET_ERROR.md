# 🗂️ Fix "Bucket not found" Error

## ❌ **Problem**
You're getting "Bucket not found" error because the Supabase Storage buckets haven't been created yet.

## ✅ **Solution: Create Storage Buckets**

### **Step 1: Access Supabase Storage**

1. **Go to** [supabase.com](https://supabase.com)
2. **Login** and select your project
3. **Click** "Storage" in the left sidebar
4. **You should see** "Create a new bucket" button

### **Step 2: Create Product Images Bucket**

1. **Click** "Create a new bucket"
2. **Fill out the form**:
   - **Name**: `product-images`
   - **Public bucket**: ✅ **Check this box** (important!)
   - **File size limit**: `5242880` (5MB in bytes)
   - **Allowed MIME types**: `image/*`
3. **Click** "Create bucket"

### **Step 3: Create Category Images Bucket**

1. **Click** "Create a new bucket" again
2. **Fill out the form**:
   - **Name**: `category-images`
   - **Public bucket**: ✅ **Check this box** (important!)
   - **File size limit**: `5242880` (5MB in bytes)
   - **Allowed MIME types**: `image/*`
3. **Click** "Create bucket"

### **Step 4: Set Storage Policies**

After creating the buckets, run this SQL in Supabase SQL Editor:

```sql
-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy for product images - allow public read, authenticated write
CREATE POLICY "Public can view product images" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload product images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'product-images' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can update product images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'product-images' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can delete product images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'product-images' 
    AND auth.role() = 'authenticated'
  );

-- Policy for category images - allow public read, authenticated write
CREATE POLICY "Public can view category images" ON storage.objects
  FOR SELECT USING (bucket_id = 'category-images');

CREATE POLICY "Authenticated users can upload category images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'category-images' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can update category images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'category-images' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can delete category images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'category-images' 
    AND auth.role() = 'authenticated'
  );
```

## 🎯 **Alternative: Quick Setup via SQL**

If you prefer, you can also create the buckets via SQL:

```sql
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('product-images', 'product-images', true, 5242880, ARRAY['image/*']),
  ('category-images', 'category-images', true, 5242880, ARRAY['image/*']);
```

## 🚀 **Test After Setup**

### **Step 1: Verify Buckets Exist**
1. **Go to** Storage in Supabase Dashboard
2. **You should see** both buckets:
   - `product-images`
   - `category-images`

### **Step 2: Test Image Upload**
1. **Go to** `/admin/products/new`
2. **Try uploading** an image
3. **Should work** without "Bucket not found" error

## 🔧 **Troubleshooting**

### **If Buckets Still Don't Work**

1. **Check bucket names** - Must be exactly:
   - `product-images`
   - `category-images`

2. **Check public setting** - Both buckets must be public

3. **Check policies** - Run the SQL policies above

4. **Check authentication** - Make sure you're logged in as admin

### **If You Get Permission Errors**

Run this additional SQL:

```sql
-- Grant storage permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;
```

## 🎉 **After Setup**

Your image upload will work perfectly with:
- ✅ **Product images** uploaded to `product-images` bucket
- ✅ **Category images** uploaded to `category-images` bucket
- ✅ **Public access** for displaying images
- ✅ **Admin-only upload** for security
- ✅ **Automatic URL generation** for images

**Create the storage buckets and your image upload will work!** 📸✨
