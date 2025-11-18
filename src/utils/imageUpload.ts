import { createClient } from '@/lib/supabase/client';

// Helper to get current user ID (client-side only)
async function getCurrentUserId(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  
  try {
    const { auth, getAuth } = await import('@/lib/firebase/config');
    const authInstance = auth || getAuth();
    
    if (authInstance?.currentUser) {
      return authInstance.currentUser.uid;
    }
    
    // Fallback to localStorage
    return localStorage.getItem('firebase_user_id');
  } catch {
    return localStorage.getItem('firebase_user_id');
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
    const userId = providedUserId || await getCurrentUserId();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', bucket);
    formData.append('folder', folder);
    formData.append('useFixedName', useFixedName.toString());

    const headers: HeadersInit = {};
    if (userId) headers['X-User-Id'] = userId;

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

