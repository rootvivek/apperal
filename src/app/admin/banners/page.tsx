'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminGuard from '@/components/admin/AdminGuard';
import Alert from '@/components/ui/alert';
import { createClient } from '@/lib/supabase/client';
import { uploadImageToSupabase } from '@/utils/imageUpload';
import { useAuth } from '@/contexts/AuthContext';
import ImageUpload from '@/components/ImageUpload';
import Banner from '@/components/Banner';

interface BannerData {
  id: string;
  section_name: string;
  image_url: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export default function BannersPage() {
  const supabase = createClient();
  const { user } = useAuth();
  const [banners, setBanners] = useState<BannerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerData | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setBanners(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File, banner: BannerData) => {
    setUploading(true);
    setError(null);
    
    try {
      // Get user ID from Supabase auth
      let userId: string | null = user?.id || null;
      
      if (!userId) {
        // Fallback: try to get from localStorage
        if (typeof window !== 'undefined') {
          userId = localStorage.getItem('user_id');
        }
        
        if (!userId) {
          throw new Error('User not authenticated. Please sign in again.');
        }
      }
      
      const result = await uploadImageToSupabase(
        file,
        'banners',
        banner.section_name,
        false,
        userId
      );

      if (result.success && result.url) {
        const { error: updateError } = await supabase
          .from('banners')
          .update({ image_url: result.url })
          .eq('id', banner.id);

        if (updateError) throw updateError;
        
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        fetchBanners();
      } else {
        setError(result.error || 'Failed to upload image');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const toggleActive = async (banner: BannerData) => {
    try {
      const { error } = await supabase
        .from('banners')
        .update({ is_active: !banner.is_active })
        .eq('id', banner.id);

      if (error) throw error;
      fetchBanners();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <AdminGuard>
        <AdminLayout>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-gray-400 text-6xl mb-4">⏳</div>
              <p className="text-gray-600">Loading banners...</p>
            </div>
          </div>
        </AdminLayout>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="space-y-1">
          {/* Page Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Banners</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage banner images for different sections of your store.
            </p>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <Alert 
              message="Banner updated successfully!" 
              variant="success" 
              className="mb-2 text-xs px-1 py-0.5"
              autoDismiss={3000}
            />
          )}
          {error && (
            <Alert 
              message={error} 
              variant="error" 
              className="mb-2 text-xs px-1 py-0.5"
            />
          )}

          {/* Banners Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
            {banners.map((banner) => (
              <div
                key={banner.id}
                className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden"
              >
                {/* Banner Preview */}
                <div className="relative">
                  <Banner sectionName={banner.section_name} imageUrl={banner.image_url} />
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={() => toggleActive(banner)}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        banner.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {banner.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                </div>

                {/* Banner Info */}
                <div className="p-1">
                  <h3 className="font-semibold text-gray-900 mb-0.5 text-xs">
                    {banner.section_name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </h3>
                  <p className="text-xs text-gray-500 mb-1">
                    Section: <code className="text-xs bg-gray-100 px-0.5 py-0 rounded">{banner.section_name}</code>
                  </p>

                  {/* Image Upload */}
                  <div className="space-y-0.5">
                    <label className="block text-sm font-medium text-gray-700">
                      Upload New Image
                    </label>
                    <ImageUpload
                      onImageUpload={(file) => handleImageUpload(file, banner)}
                      currentImageUrl={banner.image_url}
                      placeholder="Click to upload banner image"
                      uploading={uploading}
                      folder="banners"
                    />
                    <p className="text-xs text-gray-500">
                      Recommended: 1200x300px (desktop) or 1200x150px (mobile)
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {banners.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <div className="text-gray-400 text-6xl mb-4">🖼️</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No banners found</h3>
              <p className="text-gray-500">
                Banners will appear here once they are created in the database.
              </p>
            </div>
          )}
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}

