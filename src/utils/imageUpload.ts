import { createClient } from '@/lib/supabase/client';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export async function uploadImageToSupabase(
  file: File, 
  bucket: string = 'product-images',
  folder: string = 'products',
  useFixedName: boolean = false
): Promise<UploadResult> {
  try {
    const supabase = createClient();
    
    // Validate file
    if (!file || !file.name) {
      console.error('Invalid file object:', file);
      return { success: false, error: 'Invalid file provided' };
    }
    
    console.log('File details:', { name: file.name, size: file.size, type: file.type });
    
    // Generate filename
    const fileExt = file.name.split('.').pop();
    let fileName: string;
    let filePath: string;
    
    if (useFixedName) {
      // Use fixed filename like "image.jpg" for easy replacement
      fileName = `image.${fileExt}`;
      filePath = `${folder}/${fileName}`;
    } else {
      // Generate unique filename for products
      fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      filePath = `${folder}/${fileName}`;
    }
    
    console.log('Uploading image to path:', filePath);
    
    // For fixed name files, delete ALL old files in the folder first
    if (useFixedName) {
      console.log(`Cleaning folder ${folder} before upload...`);
      const deleted = await deleteFolderContents(bucket, folder);
      console.log(`Folder cleaned: ${deleted}`);
      
      // Small delay to ensure folder cleanup is fully processed by Supabase
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Upload file to Supabase Storage
    // Use upsert for fixed name files to overwrite if exists
    console.log(`Starting upload to ${bucket}/${filePath}...`);
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: useFixedName // Use upsert for fixed name files to allow overwriting
      });
    
    if (error) {
      console.error('Upload error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Failed path:', filePath);
      console.error('Bucket:', bucket);
      
      // If resource already exists and we're using fixed name, try to delete and re-upload
      if (error.message.includes('already exists') && useFixedName) {
        console.log('File exists, deleting and retrying...');
        try {
          const bucketApi = supabase.storage.from(bucket);
          if (bucketApi && typeof (bucketApi as any).remove === 'function') {
            await (bucketApi as any).remove([filePath]);
            // Retry upload
            const { data: retryData, error: retryError } = await supabase.storage
              .from(bucket)
              .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
              });
            
            if (retryError) {
              return { success: false, error: retryError.message };
            }
            
            // Success on retry
            const { data: { publicUrl } } = supabase.storage
              .from(bucket)
              .getPublicUrl(filePath);
            
            // Add cache-busting parameter for fixed-name uploads to bypass browser cache
            const finalUrl = useFixedName ? `${publicUrl}?t=${Date.now()}` : publicUrl;
            
            return { success: true, url: finalUrl };
          }
        } catch (retryErr: any) {
          return { success: false, error: retryErr.message };
        }
      }
      
      // If bucket doesn't exist, try to create it
      if (error.message.includes('Bucket not found')) {
        return { 
          success: false, 
          error: `Bucket '${bucket}' not found. Please create the bucket in Supabase Storage dashboard first.` 
        };
      }
      
      return { success: false, error: error.message };
    }
    
    // Upload successful
    console.log('Upload successful! Data:', data);
    console.log('File path:', filePath);
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);
    
    console.log('Public URL generated:', publicUrl);
    
    // Add cache-busting parameter for fixed-name uploads to bypass browser cache
    const finalUrl = useFixedName ? `${publicUrl}?t=${Date.now()}` : publicUrl;
    
    console.log('Final URL with cache-busting:', finalUrl);
    
    return { success: true, url: finalUrl };
    
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

// Delete image from Supabase storage
export async function deleteImageFromSupabase(
  imageUrl: string,
  bucket: string = 'product-images'
): Promise<boolean> {
  try {
    const supabase = createClient();
    
    // Remove query parameters from URL (e.g., ?t=timestamp for cache busting)
    const cleanUrl = imageUrl.split('?')[0];
    
    // Extract file path from URL
    const urlParts = cleanUrl.split(`/${bucket}/`);
    if (urlParts.length < 2) {
      console.warn('Could not extract file path from URL:', imageUrl);
      return false;
    }
    
    const filePath = urlParts[1];
    console.log('Deleting file from bucket:', bucket, 'path:', filePath);
    
    // Delete the file using the correct Supabase method
    const { data, error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);
    
    if (error) {
      console.error('Error deleting image from storage:', error);
      return false;
    }
    
    console.log('File deleted successfully from storage');
    return true;
  } catch (error: any) {
    console.error('Delete error:', error);
    return false;
  }
}

// Delete all files in a folder
export async function deleteFolderContents(
  bucket: string,
  folder: string
): Promise<boolean> {
  try {
    const supabase = createClient();
    
    // List all files in the folder
    const { data: files, error: listError } = await supabase.storage
      .from(bucket)
      .list(folder);
    
    if (listError) {
      console.warn('Could not list folder contents:', listError);
      return false;
    }
    
    if (!files || files.length === 0) {
      console.log('Folder is already empty:', folder);
      return true; // Folder is already empty
    }
    
    // Delete all files in the folder
    const filePaths = files.map((file: any) => `${folder}/${file.name}`);
    console.log('Deleting', filePaths.length, 'files from folder:', folder);
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .remove(filePaths);
    
    if (error) {
      console.error('Error deleting folder contents:', error);
      return false;
    }
    
    console.log(`Successfully deleted ${filePaths.length} files from ${folder}`);
    return true;
  } catch (error: any) {
    console.error('Delete folder contents error:', error);
    return false;
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
