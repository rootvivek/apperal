import { createClient } from '@/lib/supabase/client'

export default async function TestSupabase() {
  const supabase = createClient()
  
  try {
    // Test basic connection
    const { data, error } = await supabase.from('categories').select('*').limit(1)
    
    if (error) {
      return (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <h3 className="font-bold">Supabase Connection Error:</h3>
          <p>{error.message}</p>
          <p className="mt-2 text-sm">Please check your database schema and ensure tables are created.</p>
        </div>
      )
    }
    
    return (
      <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded">
        <h3 className="font-bold">Supabase Connection Success!</h3>
        <p>Database connection is working properly.</p>
        <p className="mt-2 text-sm">Categories found: {data?.length || 0}</p>
      </div>
    )
  } catch (err: any) {
    return (
      <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
        <h3 className="font-bold">Connection Test Failed:</h3>
        <p>{err.message}</p>
      </div>
    )
  }
}
