'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

export default function DebugAuth() {
  const { user, session, loading, signingOut, signOut } = useAuth();
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const addLog = (message: string) => {
      const timestamp = new Date().toLocaleTimeString();
      setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    };

    addLog(`User: ${user ? user.email : 'null'}`);
    addLog(`Session: ${session ? 'exists' : 'null'}`);
    addLog(`Loading: ${loading}`);
    addLog(`SigningOut: ${signingOut}`);
  }, [user, session, loading, signingOut]);

  const handleSignOut = async () => {
    setLogs(prev => [...prev, '🚪 Starting sign out...']);
    try {
      await signOut();
      setLogs(prev => [...prev, '✅ Sign out completed']);
    } catch (error) {
      setLogs(prev => [...prev, `❌ Sign out error: ${error}`]);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Auth Debug Page</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Auth State</h2>
          <div className="space-y-2">
            <p><strong>User:</strong> {user ? user.email : 'null'}</p>
            <p><strong>Session:</strong> {session ? 'exists' : 'null'}</p>
            <p><strong>Loading:</strong> {loading ? 'true' : 'false'}</p>
            <p><strong>Signing Out:</strong> {signingOut ? 'true' : 'false'}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="space-x-4">
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
            >
              {signingOut ? 'Signing Out...' : 'Sign Out'}
            </button>
            <button
              onClick={clearLogs}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Clear Logs
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Debug Logs</h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
            {logs.map((log, index) => (
              <div key={index}>{log}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
