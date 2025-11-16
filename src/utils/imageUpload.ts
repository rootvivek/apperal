import { createClient } from '@/lib/supabase/client';

// Helper to get current user ID (client-side only)
async function getCurrentUserId(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  
  try {
    // Try to get from Firebase auth
    const { auth } = await import('@/lib/firebase/config');
    if (auth && auth.currentUser) {
      return auth.currentUser.uid;
    }
    
    // Fallback: try to get from localStorage (if stored)
    const storedUserId = localStorage.getItem('firebase_user_id');
    if (storedUserId) {
      return storedUserId;
    }
  } catch (e) {
    console.warn('Could not get user ID:', e);
  }
  
  return null;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export async function uploadImageToSupabase(
  file: File, 
  bucket: string = 'product-images',
  folder: string = 'products',
  useFixedName: boolean = false,
  userId?: string | null
): Promise<UploadResult> {
  try {
    // For product images and category images, use API route with compression
    // This ensures consistent processing and bypasses RLS issues
    if (bucket === 'product-images' || bucket === 'category-images' || bucket === 'subcategory-images') {
      return await uploadImageViaAPI(file, bucket, folder, useFixedName, userId);
    }

    // For other buckets, use direct upload
    const supabase = createClient();
    
    // Validate file
    if (!file || !file.name) {
      return { success: false, error: 'Invalid file provided' };
    }
    
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
    
    // For fixed name files, delete ALL old files in the folder first
    if (useFixedName) {
      await deleteFolderContents(bucket, folder);
      // Small delay to ensure folder cleanup is fully processed by Supabase
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Upload file to Supabase Storage with long-term cache (1 year)
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '31536000, immutable',
        upsert: useFixedName // Use upsert for fixed name files to allow overwriting
      });
    
    if (error) {
      // If resource already exists and we're using fixed name, try to delete and re-upload
      if (error.message.includes('already exists') && useFixedName) {
        try {
          const bucketApi = supabase.storage.from(bucket);
          if (bucketApi && typeof (bucketApi as any).remove === 'function') {
            await (bucketApi as any).remove([filePath]);
            // Retry upload with long-term cache (1 year)
            const { data: retryData, error: retryError } = await supabase.storage
              .from(bucket)
              .upload(filePath, file, {
                cacheControl: '31536000, immutable',
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
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);
    
    // Add cache-busting parameter for fixed-name uploads to bypass browser cache
    const finalUrl = useFixedName ? `${publicUrl}?t=${Date.now()}` : publicUrl;
    
    return { success: true, url: finalUrl };
    
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Upload image via API route (with compression and WebP conversion)
async function uploadImageViaAPI(
  file: File,
  bucket: string,
  folder: string,
  useFixedName: boolean,
  providedUserId?: string | null
): Promise<UploadResult> {
  try {
    // Get user ID for admin authentication (use provided ID or fetch from auth)
    let userId = providedUserId;
    if (!userId) {
      userId = await getCurrentUserId();
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', bucket);
    formData.append('folder', folder);
    formData.append('useFixedName', useFixedName.toString());

    // Add user ID to headers for admin authentication
    const headers: HeadersInit = {};
    if (userId) {
      headers['X-User-Id'] = userId;
    }

    const response = await fetch('/api/admin/upload-image', {
      method: 'POST',
      headers,
      body: formData
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      return { 
        success: false, 
        error: result.error || 'Upload failed' 
      };
    }

    return { success: true, url: result.url };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to upload image' };
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
      return false;
    }
    
    const filePath = urlParts[1];
    
    const { error } = await (supabase.storage
      .from(bucket) as any)
      .remove([filePath]);
    
    if (error) {
      return false;
    }
    
    return true;
  } catch (error: any) {
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
    const { data: files, error: listError } = await (supabase.storage
      .from(bucket) as any)
      .list(folder);
    
    if (listError) {
      return false;
    }
    
    if (!files || files.length === 0) {
      return true;
    }
    
    // Delete all files in the folder
    const filePaths = files.map((file: any) => `${folder}/${file.name}`);
    
    const { error } = await (supabase.storage
      .from(bucket) as any)
      .remove(filePaths);
    
    if (error) {
      return false;
    }
    
    return true;
  } catch (error: any) {
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
