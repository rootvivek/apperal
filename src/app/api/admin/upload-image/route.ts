import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withAdminAuth } from '@/lib/middleware/adminAuth';
import { FILE_LIMITS, IMAGE_SETTINGS } from '@/constants';

async function loadSharp() {
  try {
    if (typeof require !== 'undefined') {
      return { default: require('sharp') };
    }
    return await import('sharp');
  } catch {
    return null;
  }
}

async function uploadImageHandler(request: NextRequest, { userId: adminUserId }: { userId: string }) {
  try {
    const formData = await request.formData();

    const file = formData.get('file') as File;
    const bucket = formData.get('bucket') as string || 'product-images';
    const folder = formData.get('folder') as string || 'products';
    const useFixedName = formData.get('useFixedName') === 'true';

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'No file provided or invalid file' },
        { status: 400 }
      );
    }

    if (!FILE_LIMITS.VALID_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only images are allowed.' },
        { status: 400 }
      );
    }

    if (file.size > FILE_LIMITS.MAX_SIZE) {
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

    // Try to load and use sharp for image processing
    const sharpModule = await loadSharp();
    
    if (sharpModule?.default) {
      try {
        const sharp = sharpModule.default;
        const metadata = await sharp(buffer).metadata();
        let instance = sharp(buffer);
        
        if (metadata.width && metadata.width > IMAGE_SETTINGS.MAX_DIMENSION) {
          instance = instance.resize(IMAGE_SETTINGS.MAX_DIMENSION, null, { withoutEnlargement: true, fit: 'inside' });
        } else if (metadata.height && metadata.height > IMAGE_SETTINGS.MAX_DIMENSION) {
          instance = instance.resize(null, IMAGE_SETTINGS.MAX_DIMENSION, { withoutEnlargement: true, fit: 'inside' });
        }
        
        processedBuffer = await instance.webp({ 
          quality: IMAGE_SETTINGS.WEBP_QUALITY, 
          effort: IMAGE_SETTINGS.WEBP_EFFORT 
        }).toBuffer();
      } catch {
        processedBuffer = buffer;
        fileExt = file.name.split('.').pop() || 'jpg';
      }
    } else {
      processedBuffer = buffer;
      fileExt = file.name.split('.').pop() || 'jpg';
    }

    // Generate filename
    fileName = useFixedName 
      ? `image.${fileExt}`
      : `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    filePath = `${folder}/${fileName}`;

    // Get Supabase client
    const supabase = createServerClient();

    // Delete old files if using fixed name
    if (useFixedName) {
      try {
        const { data: files } = await supabase.storage.from(bucket).list(folder);
        if (files?.length) {
          await supabase.storage.from(bucket).remove(files.map(f => `${folder}/${f.name}`));
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch {
        // Continue even if delete fails
      }
    }

    const processedFile = new File([new Uint8Array(processedBuffer)], fileName, {
      type: fileExt === 'webp' ? 'image/webp' : file.type || 'image/jpeg',
      lastModified: Date.now()
    });

    const contentType = fileExt === 'webp' ? 'image/webp' : file.type || 'image/jpeg';
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, processedFile, {
        cacheControl: '31536000, immutable',
        upsert: useFixedName,
        contentType
      });

    if (error) {
      if (error.message.includes('already exists') && useFixedName) {
        await supabase.storage.from(bucket).remove([filePath]);
        const { error: retryError } = await supabase.storage
          .from(bucket)
          .upload(filePath, processedFile, { cacheControl: '31536000, immutable', upsert: false, contentType });
        if (retryError) {
          return NextResponse.json({ success: false, error: retryError.message }, { status: 500 });
        }
      } else if (error.message.includes('Bucket not found')) {
        return NextResponse.json({ success: false, error: `Bucket '${bucket}' not found` }, { status: 404 });
      } else {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
    }

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return NextResponse.json({ success: true, url: useFixedName ? `${publicUrl}?t=${Date.now()}` : publicUrl });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to upload image' },
      { status: 500 }
    );
  }
}

export const POST = withAdminAuth(uploadImageHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 30 },
});
