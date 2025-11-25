import { createClient } from '@/lib/supabase/client';

// Helper to get current user ID (client-side only)
async function getCurrentUserId(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  
  try {
    // First, try to get from localStorage (fastest, most reliable)
    const storedUserId = localStorage.getItem('user_id');
    if (storedUserId) {
      return storedUserId;
    }
    
    // Then try to get from Supabase auth
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user?.id) {
        // Store in localStorage for future use
        localStorage.setItem('user_id', user.id);
        return user.id;
      }
    } catch (supabaseError) {
      // Supabase might not be initialized yet, continue to other methods
    }
    
    // Last resort: try to wait a bit and check again (in case auth is still initializing)
    // This is a fallback for cases where auth hasn't initialized yet
    return null;
  } catch (error) {
    // Final fallback to localStorage
    return localStorage.getItem('user_id');
  }
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
  return await uploadImageViaAPI(file, bucket, folder, useFixedName, userId);
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
    let userId = providedUserId;
    
    // If no userId provided, try to get it
    if (!userId) {
      userId = await getCurrentUserId();
    }
    
    // If still no userId, try one more time with a small delay (in case auth is initializing)
    if (!userId) {
      await new Promise(resolve => setTimeout(resolve, 100));
      userId = await getCurrentUserId();
    }
    
    if (!userId) {
      return { 
        success: false, 
        error: 'User not authenticated. Please sign in and try again. If the problem persists, please refresh the page.' 
      };
    }
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', bucket);
    formData.append('folder', folder);
    formData.append('useFixedName', useFixedName.toString());

    const headers: HeadersInit = {
      'X-User-Id': userId
    };

    const response = await fetch('/api/admin/upload-image', {
      method: 'POST',
      headers,
      body: formData
    });

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      const text = await response.text();
      return { success: false, error: `Server error: ${text.substring(0, 200)}` };
    }

    const result = await response.json();
    if (!response.ok || !result.success) {
      return { success: false, error: result.error || 'Upload failed' };
    }

    return { success: true, url: result.url };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to upload image' };
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

