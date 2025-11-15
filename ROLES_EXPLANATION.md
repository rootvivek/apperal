# User Roles Explanation

## Three Types of Access in Supabase

### 1. **Authenticated Users** (Regular Users)
- **Who**: Any logged-in user with a valid session
- **Access**: Limited by RLS policies
- **Example**: A customer who signed up and logged in
- **In our app**: Can only VIEW active products/categories (read-only)

### 2. **Admin Users** (Special Authenticated Users)
- **Who**: Authenticated users whose phone number matches the admin phone
- **Access**: Full access (view, edit, delete, insert) - determined by RLS policies
- **How it works**: 
  - User logs in normally (becomes "authenticated")
  - Our `check_admin_by_phone()` function checks if their phone matches admin phone
  - If match → Admin gets full access via RLS policies
- **In our app**: Can do EVERYTHING (create, edit, delete products/categories)

### 3. **Service Role** (System/Bypass Role)
- **Who**: Server-side only (never used in client code)
- **Access**: Bypasses ALL RLS policies completely
- **When used**: 
  - API routes that need to bypass security
  - Server-side operations
  - Background jobs
- **Security**: Uses `SUPABASE_SERVICE_ROLE_KEY` (secret, never exposed to client)
- **In our app**: Used in `/api/admin/*` routes for complex operations

## Visual Comparison

```
┌─────────────────────────────────────────────────────────┐
│                    Access Levels                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Service Role                                           │
│  ────────────                                           │
│  ✅ Bypasses ALL RLS                                    │
│  ✅ Can do ANYTHING                                     │
│  ⚠️  Server-side only                                   │
│  ⚠️  Never in client code                               │
│                                                         │
│  Admin (Authenticated + Phone Match)                    │
│  ───────────────────────────────────                   │
│  ✅ Full access via RLS policies                        │
│  ✅ Can view, edit, delete, insert                      │
│  ✅ Can see inactive items                              │
│  ✅ Client-side operations                               │
│                                                         │
│  Authenticated User (Regular User)                      │
│  ──────────────────────────────────────                  │
│  ✅ Can view active items only                          │
│  ❌ Cannot edit/delete                                  │
│  ❌ Cannot see inactive items                           │
│                                                         │
│  Anonymous (Not Logged In)                              │
│  ────────────────────────                               │
│  ❌ No access (blocked by RLS)                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## In Our Codebase

### Client-Side (Browser)
- Uses: **Authenticated User** or **Admin** (via RLS)
- File: `src/lib/supabase/client.ts`
- Key: `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public, safe to expose)

### Server-Side (API Routes)
- Uses: **Service Role** (bypasses RLS)
- File: `src/lib/supabase/server.ts`
- Key: `SUPABASE_SERVICE_ROLE_KEY` (secret, never exposed)

### Admin Check
- Function: `check_admin_by_phone()` in SQL
- Checks: User's phone number matches admin phone
- Result: Admin gets full access via RLS policies

## Why This Setup?

1. **Security**: RLS policies enforce security at database level
2. **Flexibility**: Admins can work from client-side (browser)
3. **Power**: Service role for complex operations that need to bypass RLS
4. **Simplicity**: Regular users just view, admins do everything

