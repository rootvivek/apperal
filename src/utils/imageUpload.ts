import { createClient } from '@/lib/supabase/client';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export async function uploadImageToSupabase(
  file: File, 
  bucket: string = 'product-images',
  folder: string = 'products'
): Promise<UploadResult> {
  try {
    const supabase = createClient();
    
    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;
    
    console.log('Uploading image to path:', filePath);
    
    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('Upload error:', error);
      console.error('Failed path:', filePath);
      
      // If bucket doesn't exist, try to create it
      if (error.message.includes('Bucket not found')) {
        return { 
          success: false, 
          error: `Bucket '${bucket}' not found. Please create the bucket in Supabase Storage dashboard first.` 
        };
      }
      
      return { success: false, error: error.message };
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);
    
    return { success: true, url: publicUrl };
    
  } catch (error: any) {
    console.error('Upload error:', error);
    return { success: false, error: error.message };
  }
}

export async function uploadImageToCloudinary(file: File): Promise<UploadResult> {
  try {
    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'apperal_products'); // You'll need to set this up in Cloudinary
    
    // Upload to Cloudinary
    const response = await fetch('https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Upload failed');
    }
    
    const data = await response.json();
    return { success: true, url: data.secure_url };
    
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    return { success: false, error: error.message };
  }
}

// Fallback: Convert to base64 (for small images)
export function convertToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}
