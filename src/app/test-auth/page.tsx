'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function TestAuth() {
  const { user, loading, signIn, signUp } = useAuth();
  const [testEmail, setTestEmail] = useState('test@example.com');
  const [testPassword, setTestPassword] = useState('testpassword123');
  const [result, setResult] = useState('');

  const handleTestSignUp = async () => {
    setResult('Testing signup...');
    try {
      const { data, error } = await signUp(testEmail, testPassword, {
        first_name: 'Test',
        last_name: 'User'
      });
      
      if (error) {
        setResult(`Signup Error: ${error}`);
      } else {
        setResult(`Signup Success: ${JSON.stringify(data)}`);
      }
    } catch (err: any) {
      setResult(`Signup Exception: ${err.message}`);
    }
  };

  const handleTestSignIn = async () => {
    setResult('Testing signin...');
    try {
      const { data, error } = await signIn(testEmail, testPassword);
      
      if (error) {
        setResult(`Signin Error: ${error}`);
      } else {
        setResult(`Signin Success: ${JSON.stringify(data)}`);
      }
    } catch (err: any) {
      setResult(`Signin Exception: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Authentication Test Page</h1>
        
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Auth State</h2>
          <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
          <p><strong>User:</strong> {user ? user.email : 'Not logged in'}</p>
          <p><strong>User ID:</strong> {user?.id || 'N/A'}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Authentication</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Test Email
              </label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Test Password
              </label>
              <input
                type="password"
                value={testPassword}
                onChange={(e) => setTestPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={handleTestSignUp}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Test Signup
              </button>
              
              <button
                onClick={handleTestSignIn}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Test Signin
              </button>
            </div>
          </div>
        </div>

        {result && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Test Result</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {result}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
