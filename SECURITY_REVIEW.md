# Security Review & Recommendations

## 🔴 Critical Issues

### 1. Admin Phone Number Hardcoded Fallback
**Location:** `src/lib/middleware/adminAuth.ts:6` and `src/components/admin/AdminGuard.tsx:13`

**Issue:**
```typescript
const ADMIN_PHONE = process.env.ADMIN_PHONE || '8881765192';
```
If environment variable is not set, it falls back to a hardcoded phone number.

**Fix:**
```typescript
const ADMIN_PHONE = process.env.ADMIN_PHONE;
if (!ADMIN_PHONE) {
  throw new Error('ADMIN_PHONE environment variable is required');
}
```

### 2. Weak Admin Phone Matching
**Location:** `src/lib/middleware/adminAuth.ts:120-121`

**Issue:**
```typescript
const isAdmin = normalizedUserPhone === normalizedAdminPhone || 
               normalizedUserPhone.endsWith(normalizedAdminPhone);
```
The `endsWith` check is vulnerable. Phone `"18881765192"` would match admin phone `"8881765192"`.

**Fix:**
```typescript
// Only exact match
const isAdmin = normalizedUserPhone === normalizedAdminPhone;
```

### 3. User ID from Headers Can Be Spoofed
**Location:** `src/lib/middleware/adminAuth.ts:18-24`

**Issue:** User ID is taken directly from headers without validation. An attacker could send any user ID in the header.

**Current:** Already validates user exists and checks phone number, but should validate format first.

**Fix:** Add format validation before database lookup:
```typescript
// Validate user ID format first
if (headerUserId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(headerUserId) && 
    !/^[a-zA-Z0-9]{20,28}$/.test(headerUserId)) {
  return { isAdmin: false, error: 'Invalid user ID format' };
}
```

### 4. CSP Allows Unsafe Eval and Inline Scripts
**Location:** `src/middleware.ts:37-38`

**Issue:**
```typescript
"script-src 'self' 'unsafe-eval' 'unsafe-inline' ..."
```
This weakens XSS protection significantly.

**Fix:** Remove `'unsafe-eval'` and `'unsafe-inline'` if possible. If Firebase/Razorpay requires it, use nonces or hashes:
```typescript
"script-src 'self' 'nonce-{random-nonce}' https://checkout.razorpay.com ..."
```

### 5. innerHTML Usage (XSS Risk)
**Location:** `src/contexts/AuthContext.tsx:305`

**Issue:**
```typescript
container.innerHTML = '';
```
While clearing is safe, using innerHTML in general is risky.

**Fix:** Use `textContent` or React's safe rendering methods when possible.

---

## 🟡 Medium Priority Issues

### 6. Missing Rate Limiting on Most Admin Routes
**Location:** Most admin API routes

**Issue:** Only a few routes have rate limiting (`delete-user`, `reactivate-user`, etc.). All admin routes should have rate limiting.

**Fix:** Add rate limiting to all admin routes:
```typescript
import { rateLimit } from '@/lib/middleware/rateLimit';

// At the start of handler
const rateLimitResult = rateLimit({ windowMs: 60000, maxRequests: 10 })(request);
if (rateLimitResult && !rateLimitResult.allowed) {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    { status: 429 }
  );
}
```

### 7. Error Messages May Leak Information
**Location:** Various API routes

**Issue:** Some error messages expose internal details:
```typescript
{ error: `Failed to check category: ${checkError.message}` }
```

**Fix:** In production, use generic messages:
```typescript
const errorMessage = process.env.NODE_ENV === 'production' 
  ? 'An error occurred' 
  : checkError.message;
```

### 8. Search Query Directly in SQL-like Query
**Location:** `src/app/search/page.tsx:80`

**Issue:**
```typescript
.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%...`)
```
While Supabase should escape this, it's better to be explicit.

**Fix:** Use parameterized queries or validate/sanitize:
```typescript
const sanitizedQuery = searchQuery.replace(/[%_]/g, ''); // Remove SQL wildcards
// Or use RPC function with parameters (which you already have)
```

### 9. No CSRF Protection
**Location:** All POST/PUT/DELETE API routes

**Issue:** No CSRF tokens for state-changing operations.

**Fix:** Add CSRF token validation for admin routes:
```typescript
// In middleware or withAdminAuth
const csrfToken = request.headers.get('x-csrf-token');
const sessionToken = request.cookies.get('csrf-token')?.value;
if (!csrfToken || csrfToken !== sessionToken) {
  return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
}
```

### 10. Console Statements in Production Code
**Location:** Various files

**Issue:** `console.error` statements may leak information in production.

**Fix:** Use a logging service or remove in production:
```typescript
if (process.env.NODE_ENV !== 'production') {
  console.error('Error:', error);
}
```

---

## 🟢 Low Priority / Best Practices

### 11. Input Validation Coverage
**Status:** ✅ Good - Most routes use Zod validation

**Recommendation:** Ensure ALL user inputs are validated, including:
- File uploads (size, type, content)
- Image URLs
- All form fields

### 12. Service Role Key Security
**Status:** ✅ Good - Service role key is server-side only

**Recommendation:** 
- Never expose in client-side code
- Rotate keys periodically
- Use different keys for different environments

### 13. Database Query Security
**Status:** ✅ Good - Using Supabase client (parameterized queries)

**Recommendation:** Continue using Supabase client methods, avoid raw SQL with user input.

### 14. Environment Variables
**Recommendation:** 
- Use `.env.local` for local development
- Never commit `.env` files
- Use different admin phones for dev/staging/production
- Document all required environment variables

### 15. Audit Logging
**Status:** ⚠️ Partial - Some admin actions are logged

**Recommendation:** Log all admin actions:
- Who (user ID)
- What (action type)
- When (timestamp)
- What changed (before/after values)

---

## 📋 Priority Action Items

### Immediate (Critical):
1. ✅ Remove hardcoded admin phone fallback
2. ✅ Fix admin phone matching (remove `endsWith`)
3. ✅ Validate user ID format before database lookup
4. ✅ Tighten CSP (remove unsafe-eval if possible)

### Short Term (Medium):
5. ✅ Add rate limiting to all admin routes
6. ✅ Sanitize error messages in production
7. ✅ Add CSRF protection for state-changing operations

### Long Term (Best Practices):
8. ✅ Implement comprehensive audit logging
9. ✅ Add request ID tracking for debugging
10. ✅ Set up security monitoring/alerts

---

## ✅ What's Already Good

1. ✅ Zod validation on most inputs
2. ✅ Admin authentication middleware (`withAdminAuth`)
3. ✅ RLS policies in database
4. ✅ Service role key used server-side only
5. ✅ Security headers in middleware
6. ✅ HTTPS enforcement in production
7. ✅ UUID validation for IDs
8. ✅ Rate limiting on some critical routes

---

## 🔧 Quick Fixes Summary

```typescript
// 1. Fix admin phone (adminAuth.ts)
const ADMIN_PHONE = process.env.ADMIN_PHONE;
if (!ADMIN_PHONE) {
  throw new Error('ADMIN_PHONE environment variable is required');
}

// 2. Fix phone matching (adminAuth.ts)
const isAdmin = normalizedUserPhone === normalizedAdminPhone; // Remove endsWith

// 3. Validate user ID format (adminAuth.ts)
if (headerUserId && !isValidUserId(headerUserId)) {
  return { isAdmin: false, error: 'Invalid user ID format' };
}

// 4. Add rate limiting wrapper
export function withRateLimit(handler: Function) {
  return async (request: NextRequest) => {
    const rateLimitResult = rateLimit({ windowMs: 60000, maxRequests: 10 })(request);
    if (rateLimitResult && !rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
    return handler(request);
  };
}
```

---

**Note:** This review is based on current codebase. Regular security audits are recommended, especially before major releases.

