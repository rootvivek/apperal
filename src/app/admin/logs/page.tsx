'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminGuard from '@/components/admin/AdminGuard';
import { createClient } from '@/lib/supabase/client';
import DataTable from '@/components/DataTable';

interface AdminLog {
  id: string;
  admin_id: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  admin_name?: string;
}

export default function AdminLogsPage() {
  const supabase = createClient();
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<AdminLog | null>(null);
  const [showLogDetails, setShowLogDetails] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('admin_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (fetchError) {
        throw fetchError;
      }

      // Fetch admin names for each log
      const logsWithNames = await Promise.all(
        (data || []).map(async (log: AdminLog) => {
          if (log.admin_id) {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('full_name, email')
              .eq('id', log.admin_id)
              .maybeSingle();
            
            return {
              ...log,
              admin_name: profile?.full_name || profile?.email || 'Unknown',
            };
          }
          return { ...log, admin_name: 'Unknown' };
        })
      );

      setLogs(logsWithNames);
    } catch (err: any) {
      setError(err.message || 'Failed to load admin logs');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      log.action?.toLowerCase().includes(searchLower) ||
      log.admin_name?.toLowerCase().includes(searchLower) ||
      log.resource_type?.toLowerCase().includes(searchLower) ||
      log.ip_address?.includes(searchLower)
    );
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Activity Logs</h1>
            <p className="text-gray-600">Audit trail of all admin actions</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="px-4 py-2 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Logs</p>
                <p className="text-2xl font-bold text-blue-600">{logs.length}</p>
              </div>
              <input
                type="text"
                placeholder="Search logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 max-w-md px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <DataTable
              columns={[
                {
                  key: 'created_at',
                  label: 'Time',
                  sortable: true,
                  render: (value: string) => formatDate(value),
                },
                {
                  key: 'admin_name',
                  label: 'Admin',
                  sortable: false,
                  render: (value: string) => (
                    <span className="font-medium">{value || 'Unknown'}</span>
                  ),
                },
                {
                  key: 'action',
                  label: 'Action',
                  sortable: true,
                  render: (value: string) => (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                      {value}
                    </span>
                  ),
                },
                {
                  key: 'resource_type',
                  label: 'Resource',
                  sortable: false,
                  render: (value: string, row: AdminLog) => (
                    <div>
                      <span className="text-sm text-gray-700 capitalize">{value || '—'}</span>
                      {row.resource_id && (
                        <span className="text-xs text-gray-500 ml-2 font-mono">
                          {row.resource_id.substring(0, 8)}...
                        </span>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'ip_address',
                  label: 'IP Address',
                  sortable: false,
                  render: (value: string) => value || '—',
                },
              ]}
              data={filteredLogs}
              isLoading={loading}
              emptyMessage="No admin logs found"
              onRowClick={(log: AdminLog) => {
                setSelectedLog(log);
                setShowLogDetails(true);
              }}
              rowKey="id"
            />
          </div>

          {/* Log Details Modal */}
          {showLogDetails && selectedLog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
                  <h2 className="text-xl font-bold">Log Details</h2>
                  <button 
                    onClick={() => setShowLogDetails(false)} 
                    className="text-2xl hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="p-6 space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Time</p>
                    <p className="font-medium">{formatDate(selectedLog.created_at)}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">Admin</p>
                    <p className="font-medium">{selectedLog.admin_name || 'Unknown'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">Action</p>
                    <p className="font-medium">{selectedLog.action}</p>
                  </div>
                  
                  {selectedLog.resource_type && (
                    <div>
                      <p className="text-sm text-gray-600">Resource Type</p>
                      <p className="font-medium capitalize">{selectedLog.resource_type}</p>
                    </div>
                  )}
                  
                  {selectedLog.resource_id && (
                    <div>
                      <p className="text-sm text-gray-600">Resource ID</p>
                      <p className="font-medium font-mono text-sm">{selectedLog.resource_id}</p>
                    </div>
                  )}
                  
                  {selectedLog.details && (
                    <div>
                      <p className="text-sm text-gray-600">Details</p>
                      <pre className="bg-gray-50 p-3 rounded text-sm overflow-auto">
                        {JSON.stringify(selectedLog.details, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {selectedLog.ip_address && (
                    <div>
                      <p className="text-sm text-gray-600">IP Address</p>
                      <p className="font-medium">{selectedLog.ip_address}</p>
                    </div>
                  )}
                  
                  {selectedLog.user_agent && (
                    <div>
                      <p className="text-sm text-gray-600">User Agent</p>
                      <p className="font-medium text-sm">{selectedLog.user_agent}</p>
                    </div>
                  )}
                </div>
                
                <div className="p-6 border-t border-gray-200">
                  <button
                    onClick={() => setShowLogDetails(false)}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}

