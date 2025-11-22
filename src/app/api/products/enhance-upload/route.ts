import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withAdminAuth } from '@/lib/middleware/adminAuth';
import { FILE_LIMITS } from '@/constants';

// Dynamic imports for optional dependencies
async function loadSharp() {
  try {
    return await import('sharp');
  } catch {
    return null;
  }
}


async function enhanceImageWithSharp(
  imageBuffer: Buffer
): Promise<Buffer<ArrayBufferLike>> {
  const sharpModule = await loadSharp();
  if (!sharpModule?.default) {
    throw new Error('Sharp is not available');
  }

  const sharp = sharpModule.default;

  // Apply enhancements: sharpen, adjust brightness/contrast, denoise
  const enhancedBuffer = await sharp(imageBuffer)
    .sharpen({ sigma: 1.5 }) // Improve sharpness
    .modulate({ brightness: 1.1, saturation: 1.05 }) // Slight brightness and color boost
    .normalize() // Normalize contrast
    .toBuffer();

  return enhancedBuffer;
}

/**
 * Process image with Sharp: crop to 4:5, resize, convert to WebP
 */
async function processImageWithSharp(
  imageBuffer: Buffer,
  targetWidth: number = 1500
): Promise<Buffer<ArrayBufferLike>> {
  const sharpModule = await loadSharp();
  if (!sharpModule?.default) {
    throw new Error('Sharp is not available');
  }

  const sharp = sharpModule.default;

  // Get image metadata
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;

  // Calculate 4:5 aspect ratio dimensions
  const targetAspectRatio = 4 / 5; // width:height = 4:5
  let cropWidth = width;
  let cropHeight = height;
  let left = 0;
  let top = 0;

  // Calculate crop dimensions to achieve 4:5 ratio
  const currentAspectRatio = width / height;

  if (currentAspectRatio > targetAspectRatio) {
    // Image is wider than 4:5, crop width
    cropWidth = Math.floor(height * targetAspectRatio);
    left = Math.floor((width - cropWidth) / 2); // Center crop
  } else {
    // Image is taller than 4:5, crop height
    cropHeight = Math.floor(width / targetAspectRatio);
    top = Math.floor((height - cropHeight) / 2); // Center crop
  }

  // Process image: crop, resize if needed, convert to WebP
  let pipeline = sharp(imageBuffer)
    .extract({
      left,
      top,
      width: cropWidth,
      height: cropHeight,
    });

  // Resize if width is larger than target
  if (cropWidth > targetWidth) {
    pipeline = pipeline.resize(targetWidth, null, {
      withoutEnlargement: true,
    });
  }

  // Convert to WebP with quality 80-85
  const webpBuffer = await pipeline
    .webp({ quality: 82 })
    .toBuffer();

  return webpBuffer;
}

/**
 * Upload enhanced image to Supabase Storage
 */
async function uploadToSupabase(
  buffer: Buffer,
  productId: string,
  timestamp: number
): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration is missing');
  }

  // Create admin client with service role key
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Generate filename
  const filename = `${productId}-${timestamp}.webp`;
  const filePath = `products/${filename}`;

  // Upload to Supabase Storage
  const { data, error } = await supabaseAdmin.storage
    .from('products')
    .upload(filePath, buffer, {
      contentType: 'image/webp',
      upsert: true,
      cacheControl: '31536000',
    });

  if (error) {
    throw new Error(`Failed to upload to Supabase: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabaseAdmin.storage
    .from('products')
    .getPublicUrl(filePath);

  if (!urlData?.publicUrl) {
    throw new Error('Failed to get public URL');
  }

  return urlData.publicUrl;
}

/**
 * Update product image_url in database
 */
async function updateProductImageUrl(
  productId: string,
  imageUrl: string
): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration is missing');
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { error } = await supabaseAdmin
    .from('products')
    .update({ image_url: imageUrl })
    .eq('id', productId);

  if (error) {
    throw new Error(`Failed to update product: ${error.message}`);
  }
}

/**
 * Main handler for image enhancement and upload
 */
async function enhanceUploadHandler(
  request: NextRequest,
  { userId: adminUserId }: { userId: string }
) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const productId = formData.get('productId') as string;

    // Validate inputs
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'No file provided or invalid file' },
        { status: 400 }
      );
    }

    if (!productId || typeof productId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only JPG, JPEG, and PNG are allowed. HEIC is not supported.' },
        { status: 400 }
      );
    }

    // Validate file size (10 MB max)
    if (file.size > FILE_LIMITS.MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: `File size exceeds ${FILE_LIMITS.MAX_SIZE / (1024 * 1024)}MB limit` },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const originalBuffer = Buffer.from(arrayBuffer);
    const mimeType = file.type;

    let enhancedBuffer: Buffer = originalBuffer;
    try {
      enhancedBuffer = Buffer.from(await enhanceImageWithSharp(originalBuffer));
    } catch (enhanceError: any) {
      console.warn('Image enhancement failed, using original image:', enhanceError.message);
    }

    const processedBuffer = Buffer.from(await processImageWithSharp(enhancedBuffer));

    // Step 3: Upload to Supabase Storage
    const timestamp = Date.now();
    const publicUrl = await uploadToSupabase(processedBuffer, productId, timestamp);

    // Step 4: Update product image_url in database
    await updateProductImageUrl(productId, publicUrl);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      message: 'Image enhanced and uploaded successfully',
    });

  } catch (error: any) {
    console.error('Image enhancement error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to enhance and upload image',
      },
      { status: 500 }
    );
  }
}

export const POST = withAdminAuth(enhanceUploadHandler);

