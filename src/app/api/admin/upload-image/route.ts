import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withAdminAuth } from '@/lib/middleware/adminAuth';
import sharp from 'sharp';

async function uploadImageHandler(request: NextRequest, { userId: adminUserId }: { userId: string }) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const bucket = formData.get('bucket') as string || 'product-images';
    const folder = formData.get('folder') as string || 'products';
    const useFixedName = formData.get('useFixedName') === 'true';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only images are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Process image: compress and convert to WebP
    let processedBuffer: Buffer;
    let fileExt = 'webp';
    let fileName: string;
    let filePath: string;

    try {
      // Get image metadata
      const metadata = await sharp(buffer).metadata();
      
      // Resize if image is too large (max width/height 2000px)
      let sharpInstance = sharp(buffer);
      if (metadata.width && metadata.width > 2000) {
        sharpInstance = sharpInstance.resize(2000, null, {
          withoutEnlargement: true,
          fit: 'inside'
        });
      } else if (metadata.height && metadata.height > 2000) {
        sharpInstance = sharpInstance.resize(null, 2000, {
          withoutEnlargement: true,
          fit: 'inside'
        });
      }

      // Convert to WebP with compression
      // Quality: 85 (good balance between quality and file size)
      processedBuffer = await sharpInstance
        .webp({ 
          quality: 85,
          effort: 6 // Higher effort = better compression but slower (0-6)
        })
        .toBuffer();

    } catch (processingError: any) {
      // If processing fails, use original file
      processedBuffer = buffer;
      fileExt = file.name.split('.').pop() || 'jpg';
    }

    // Generate filename
    if (useFixedName) {
      fileName = `image.${fileExt}`;
      filePath = `${folder}/${fileName}`;
    } else {
      // Generate unique filename with timestamp and random string
      fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      filePath = `${folder}/${fileName}`;
    }

    // Get Supabase client
    const supabase = createServerClient();

    // For fixed name files, delete old files first
    if (useFixedName) {
      try {
        const { data: files } = await supabase.storage.from(bucket).list(folder);
        if (files && files.length > 0) {
          const filePaths = files.map(f => `${folder}/${f.name}`);
          await supabase.storage.from(bucket).remove(filePaths);
        }
        // Small delay to ensure cleanup is processed
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (deleteError) {
        // Continue with upload even if delete fails
      }
    }

    // Create a File-like object from the processed buffer
    const processedFile = new File([processedBuffer], fileName, {
      type: 'image/webp',
      lastModified: Date.now()
    });

    // Upload processed image to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, processedFile, {
        cacheControl: '3600',
        upsert: useFixedName,
        contentType: 'image/webp'
      });

    if (error) {
      // If resource already exists and we're using fixed name, try to delete and re-upload
      if (error.message.includes('already exists') && useFixedName) {
        try {
          await supabase.storage.from(bucket).remove([filePath]);
          // Retry upload
          const { data: retryData, error: retryError } = await supabase.storage
            .from(bucket)
            .upload(filePath, processedFile, {
              cacheControl: '3600',
              upsert: false,
              contentType: 'image/webp'
            });

          if (retryError) {
            return NextResponse.json(
              { success: false, error: retryError.message },
              { status: 500 }
            );
          }

          // Success on retry
          const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

          const finalUrl = useFixedName ? `${publicUrl}?t=${Date.now()}` : publicUrl;

          return NextResponse.json({ success: true, url: finalUrl });
        } catch (retryErr: any) {
          return NextResponse.json(
            { success: false, error: retryErr.message },
            { status: 500 }
          );
        }
      }

      // If bucket doesn't exist
      if (error.message.includes('Bucket not found')) {
        return NextResponse.json(
          {
            success: false,
            error: `Bucket '${bucket}' not found. Please create the bucket in Supabase Storage dashboard first.`
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    // Add cache-busting parameter for fixed-name uploads
    const finalUrl = useFixedName ? `${publicUrl}?t=${Date.now()}` : publicUrl;

    return NextResponse.json({ success: true, url: finalUrl });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to upload image' },
      { status: 500 }
    );
  }
}

export const POST = withAdminAuth(uploadImageHandler);

