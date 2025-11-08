import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

interface LogAdminActionParams {
  adminId: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, any>;
  request: NextRequest;
}

/**
 * Log admin actions to the database for audit trail
 */
export async function logAdminAction({
  adminId,
  action,
  resourceType,
  resourceId,
  details,
  request,
}: LogAdminActionParams): Promise<void> {
  try {
    const supabaseAdmin = createServerClient();
    
    // Extract IP address
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    // Extract user agent
    const userAgent = request.headers.get('user-agent') || null;
    
    // Call the database function to log the action
    const { error } = await supabaseAdmin.rpc('log_admin_action', {
      p_admin_id: adminId,
      p_action: action,
      p_resource_type: resourceType || null,
      p_resource_id: resourceId || null,
      p_details: details ? JSON.stringify(details) : null,
      p_ip_address: ip !== 'unknown' ? ip : null,
      p_user_agent: userAgent,
    });
    
    if (error) {
      console.error('Error logging admin action:', error);
      // Don't throw - logging failures shouldn't break the operation
    }
  } catch (error) {
    console.error('Exception logging admin action:', error);
    // Don't throw - logging failures shouldn't break the operation
  }
}

