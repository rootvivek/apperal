# Setup Admin Logs Table

## Quick Setup Instructions

The `admin_logs` table needs to be created in your Supabase database to enable admin activity logging.

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** (in the left sidebar)
3. Click **New Query**
4. Copy the entire contents of `create-admin-logs-table.sql`
5. Paste it into the SQL Editor
6. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`)

### Option 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
supabase db push
```

Or directly:

```bash
psql -h your-db-host -U postgres -d postgres -f create-admin-logs-table.sql
```

## What This Creates

- **`admin_logs` table**: Stores all admin actions for audit trail
- **Indexes**: For fast queries by admin_id, created_at, action, and resource
- **RLS Policies**: Allows authenticated users to view logs (admin check happens in app)
- **`log_admin_action()` function**: Database function to log admin actions

## Verification

After running the migration, you can verify it worked by:

1. Going to **Table Editor** in Supabase Dashboard
2. You should see `admin_logs` table in the list
3. Or run this query in SQL Editor:
   ```sql
   SELECT * FROM admin_logs LIMIT 1;
   ```

## Troubleshooting

If you get an error about `uuid_generate_v4()`:
- Make sure the `uuid-ossp` extension is enabled:
  ```sql
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  ```

If you get permission errors:
- Make sure you're using the service role key or have proper database permissions

