'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface AdminGuardProps {
  children: React.ReactNode;
}

// Admin phone numbers - only these users can access admin panel
const ADMIN_PHONES = ['+918881765192', '8881765192'];

// Function to check if user is admin based on phone number
function isAdminUser(user: any): boolean {
  if (!user) return false;
  
  // Check if user has phone number
  const userPhone = user.phone || user.user_metadata?.phone;
  if (!userPhone) return false;
  
  // Check if phone number matches any admin phone
  return ADMIN_PHONES.some(adminPhone => {
    // Normalize phone numbers for comparison
    const normalizedUserPhone = userPhone.replace(/\s+/g, '');
    const normalizedAdminPhone = adminPhone.replace(/\s+/g, '');
    
    // Check exact match or if user phone contains admin phone (for different formats)
    return normalizedUserPhone === normalizedAdminPhone || 
           normalizedUserPhone.includes(normalizedAdminPhone) ||
           normalizedAdminPhone.includes(normalizedUserPhone);
  });
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Redirect to login if not authenticated
        router.push('/login?redirect=/admin');
        return;
      } else if (!isAdminUser(user)) {
        // Redirect to home if not admin user
        router.push('/?error=unauthorized');
        return;
      } else {
        // User is authenticated and is admin
        setIsChecking(false);
      }
    }
  }, [user, loading, router]);

  if (loading || isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking admin access...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  if (!isAdminUser(user)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You don't have permission to access the admin panel.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Only authorized administrators can access this area.
          </p>
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            ← Back to Store
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
