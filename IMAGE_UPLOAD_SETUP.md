# 📸 Image Upload Setup Guide

## ✅ **Image Upload System Implemented**

I've added comprehensive image upload functionality throughout your admin panel! Here's what's been implemented:

### **🖼️ Image Upload Features**

1. **✅ ImageUpload Component** (`/src/components/ImageUpload.tsx`)
   - **Drag & drop** functionality
   - **Click to upload** from local files
   - **Image preview** before upload
   - **File validation** (type and size)
   - **Professional UI** with loading states

2. **✅ Upload Utilities** (`/src/utils/imageUpload.ts`)
   - **Supabase Storage** integration
   - **Cloudinary** fallback option
   - **Base64** conversion for small images
   - **Error handling** and validation

3. **✅ Admin Panel Integration**
   - **Product forms** now have image upload
   - **Category forms** now have image upload
   - **Real-time preview** of uploaded images
   - **Progress indicators** during upload

## 🚀 **Setup Supabase Storage**

### **Step 1: Enable Storage in Supabase**

1. **Go to** [supabase.com](https://supabase.com)
2. **Select** your project
3. **Navigate** to **Storage** in the left sidebar
4. **Click** "Create a new bucket"

### **Step 2: Create Storage Buckets**

Create these buckets in Supabase Storage:

#### **Product Images Bucket**
- **Name**: `product-images`
- **Public**: ✅ Yes (so images can be accessed publicly)
- **File size limit**: 5MB
- **Allowed MIME types**: `image/*`

#### **Category Images Bucket**
- **Name**: `category-images`
- **Public**: ✅ Yes
- **File size limit**: 5MB
- **Allowed MIME types**: `image/*`

### **Step 3: Set Storage Policies**

Run this SQL in Supabase SQL Editor to set up storage policies:

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

## 🎯 **How to Use Image Upload**

### **Adding Product Images**

1. **Go to** `/admin/products/new`
2. **Scroll to** "Product Image" section
3. **Click** the upload area or **drag & drop** an image
4. **Select** an image from your computer
5. **Image uploads** automatically to Supabase Storage
6. **Preview appears** immediately
7. **Submit** the form - image URL is saved

### **Adding Category Images**

1. **Go to** `/admin/categories`
2. **Click** "Add Category"
3. **Scroll to** "Category Image" section
4. **Upload** an image the same way
5. **Image uploads** to category storage bucket

## 🔧 **Image Upload Features**

### **✅ Supported Features**
- **Drag & drop** - Drag images directly onto upload area
- **Click to browse** - Click to open file browser
- **Image preview** - See image before uploading
- **File validation** - Only image files accepted
- **Size limits** - Maximum 5MB per image
- **Progress indicators** - Shows upload progress
- **Error handling** - Clear error messages
- **Automatic URLs** - Generates public URLs automatically

### **✅ File Support**
- **PNG** - High quality images
- **JPG/JPEG** - Compressed images
- **GIF** - Animated images
- **WebP** - Modern web format
- **SVG** - Vector graphics

### **✅ Upload Process**
1. **Select/Drop** image file
2. **Validate** file type and size
3. **Upload** to Supabase Storage
4. **Generate** public URL
5. **Update** form with image URL
6. **Show** preview in form

## 🚀 **Test Your Image Upload**

### **Step 1: Test Product Upload**
1. **Go to** `/admin/products/new`
2. **Fill out** product details
3. **Upload** a product image
4. **Submit** the form
5. **Check** that image appears on home page

### **Step 2: Test Category Upload**
1. **Go to** `/admin/categories`
2. **Add** a new category
3. **Upload** a category image
4. **Save** the category
5. **Check** that image appears in category grid

## 🎉 **Your Admin Panel Now Has Full Image Upload!**

### **✅ What's Working**
- **Local file uploads** from your computer
- **Drag & drop** functionality
- **Real-time previews** of uploaded images
- **Automatic storage** in Supabase
- **Public URLs** generated automatically
- **Professional UI** with loading states
- **Error handling** for failed uploads

### **✅ Where It Works**
- **Product creation** - Upload product images
- **Category creation** - Upload category images
- **Edit forms** - Update existing images
- **All admin forms** - Consistent upload experience

**Your admin panel now supports full image upload from local files everywhere!** 📸✨
