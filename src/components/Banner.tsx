'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface BannerProps {
  sectionName: string;
  className?: string;
  imageUrl?: string; // Optional prop for direct image URL (for admin preview)
}

export default function Banner({ sectionName, className, imageUrl }: BannerProps) {
  const [bannerImage, setBannerImage] = useState<string | null>(imageUrl || null);
  const [loading, setLoading] = useState(!imageUrl);
  const supabase = createClient();

  useEffect(() => {
    // If imageUrl is provided, use it directly (for admin preview)
    if (imageUrl) {
      setBannerImage(imageUrl);
      setLoading(false);
      return;
    }

    // Otherwise, fetch from database
    const fetchBanner = async () => {
      try {
        const { data, error } = await supabase
          .from('banners')
          .select('image_url')
          .eq('section_name', sectionName)
          .eq('is_active', true)
          .single();

        if (error || !data) {
          setBannerImage(null);
        } else {
          setBannerImage(data.image_url);
        }
      } catch (err) {
        setBannerImage(null);
      } finally {
        setLoading(false);
      }
    };

    fetchBanner();
  }, [sectionName, imageUrl]);

  // Don't render if no image
  if (loading || !bannerImage) {
    return null;
  }

  return (
    <div
      className={cn(
        'w-full relative overflow-hidden',
        'max-h-[100px] md:h-auto md:max-h-[300px]', // max 100px mobile, auto height with max 300px desktop
        className
      )}
    >
      <img
        src={bannerImage}
        alt={`${sectionName} banner`}
        className="w-full h-auto max-h-[100px] md:max-h-[300px] object-cover"
        loading="lazy"
      />
    </div>
  );
}

