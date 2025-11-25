# 🔐 Login Flow Structure

## 📁 File Structure

```
src/
├── contexts/
│   ├── AuthContext.tsx          # Core authentication logic
│   └── LoginModalContext.tsx    # Modal state management
├── components/
│   ├── ClientLayout.tsx         # MSG91 script preloader
│   └── auth/
│       ├── LoginModal/
│       │   ├── LoginModal.tsx   # Main modal container
│       │   ├── PhoneStep.tsx    # Phone input UI
│       │   └── OtpStep.tsx       # OTP input UI
│       └── useLoginOTP.ts        # Login state hook
└── app/
    └── api/
        └── auth/
            └── verify-otp/
                └── route.ts      # OTP verification API
```

---

## 🔄 Login Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER CLICKS "LOGIN"                          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  LoginModalContext.openModal(redirectTo?)                       │
│  - Sets isOpen = true                                           │
│  - Stores redirectTo URL (optional)                            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  LoginModal Component Renders                                   │
│  - Uses useLoginOTP() hook                                      │
│  - Initial step: 'phone'                                        │
│  - Shows PhoneStep component                                    │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: PHONE INPUT (PhoneStep.tsx)                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ User enters phone number                                │   │
│  │ - Auto-formats input (removes +91, spaces)            │   │
│  │ - Validates: 10 digits, starts with 6-9                │   │
│  │ - Press Enter or click "Send OTP"                       │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  useLoginOTP.sendOtp()                                          │
│  - Validates phone (zod schema)                                 │
│  - Normalizes: 9876543210 (10 digits)                          │
│  - Calls AuthContext.sendOTP(normalizedPhone)                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  AuthContext.handleSendOTP(phone)                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1. Normalize: normalizePhone(phone) → "9876543210"      │   │
│  │ 2. Validate: validatePhone(normalized)                  │   │
│  │ 3. Format: "+919876543210" (add +91 prefix)            │   │
│  │ 4. Call MSG91: window.initSendOTP({                     │   │
│  │      widgetId, tokenAuth, identifier: "+919876543210"   │   │
│  │    })                                                    │   │
│  │ 5. Return immediately: { success: true }                │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ⚡ MSG91 script is preloaded by ClientLayout                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  MSG91 Widget (Client-Side)                                     │
│  - Sends OTP to user's phone                                   │
│  - Shows OTP verification UI                                   │
│  - Handles OTP input and verification                           │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  useLoginOTP State Update                                       │
│  - step = 'otp'                                                 │
│  - secondsLeft = 30 (resend cooldown)                          │
│  - isSending = false                                            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: OTP INPUT (OtpStep.tsx)                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ User enters 6-digit OTP                                 │   │
│  │ - Auto-submits when 6 digits entered                    │   │
│  │ - Supports paste (auto-submits if 6 digits)            │   │
│  │ - Shows "Resend OTP" with 30s cooldown                  │   │
│  │ - Can go back to edit phone number                       │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  useLoginOTP.verifyOtp()                                        │
│  - Validates OTP (6 digits)                                    │
│  - Normalizes phone: "9876543210"                              │
│  - Calls AuthContext.verifyOTP(normalizedPhone, otp)           │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  AuthContext.handleVerifyOTP(phone, otp)                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1. Normalize phone: "9876543210"                         │   │
│  │ 2. Validate phone & OTP format                           │   │
│  │ 3. Format phone: "+919876543210"                         │   │
│  │ 4. POST /api/auth/verify-otp                             │   │
│  │    { phone: "+919876543210", otp: "123456" }            │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  API: /api/auth/verify-otp (route.ts)                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1. Normalize & validate phone                           │   │
│  │ 2. Validate OTP format (6 digits)                       │   │
│  │ 3. Check user_profiles table                            │   │
│  │    - If exists: Check deleted_at, is_active            │   │
│  │    - If not: Create new user + default address          │   │
│  │ 4. Return: { success: true, user: {...} }              │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  AuthContext State Update                                       │
│  - Stores user in localStorage                                 │
│  - Updates AuthContext state: { user, loading: false }         │
│  - Sets lastUserIdRef                                          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  LoginModal useEffect (Success Handler)                         │
│  - Detects user is logged in                                   │
│  - resetState() (clears phone, otp, step)                      │
│  - closeModal()                                                │
│  - router.push(redirectTo) if redirectTo exists                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Key Components

### 1. **ClientLayout.tsx** - Script Preloader
```typescript
MSG91ScriptPreloader()
- Preloads MSG91 script on app mount
- Ensures script is ready when user clicks "Send OTP"
- Non-blocking, async loading
```

### 2. **LoginModalContext.tsx** - Modal State
```typescript
LoginModalProvider
├── isOpen: boolean
├── redirectTo?: string
├── openModal(redirectTo?)
└── closeModal()
```

### 3. **useLoginOTP.ts** - Login State Hook
```typescript
State:
├── step: 'phone' | 'otp'
├── phone: string
├── otp: string
├── error: string
├── isSending: boolean
├── isVerifying: boolean
└── secondsLeft: number (resend cooldown)

Actions:
├── sendOtp() → AuthContext.sendOTP()
├── verifyOtp() → AuthContext.verifyOTP()
├── resendOtp() → AuthContext.sendOTP()
├── resetState()
└── backToPhone()
```

### 4. **AuthContext.tsx** - Core Auth Logic
```typescript
handleSendOTP(phone)
├── Normalize: "9876543210"
├── Validate: 10 digits, starts with 6-9
├── Format: "+919876543210"
├── Call MSG91: window.initSendOTP()
└── Return: { success: true } (immediate)

handleVerifyOTP(phone, otp)
├── Normalize & validate phone
├── Validate OTP format
├── POST /api/auth/verify-otp
├── Store user in localStorage
├── Update AuthContext state
└── Return: { success: true, user }
```

### 5. **API: /api/auth/verify-otp**
```typescript
POST /api/auth/verify-otp
Body: { phone: "+919876543210", otp: "123456" }

Process:
├── Normalize phone to 10 digits
├── Validate phone & OTP format
├── Check user_profiles table
│   ├── If exists: Validate account status
│   └── If not: Create user + default address
└── Return: { success: true, user: {...} }
```

---

## 📱 UI Components

### PhoneStep.tsx
- Phone input with +91 prefix
- Auto-formatting (removes non-digits)
- Enter key to submit
- Validation feedback

### OtpStep.tsx
- 6-digit OTP input
- Auto-submit on 6 digits
- Paste support
- Resend with 30s cooldown
- Back to phone option

---

## 🔄 Data Flow

```
User Input (Phone)
    ↓
normalizePhone() → "9876543210"
    ↓
validatePhone() → { isValid: true }
    ↓
Format: "+919876543210"
    ↓
MSG91 Widget → Sends OTP
    ↓
User Input (OTP)
    ↓
verifyOTP() → API Call
    ↓
Supabase → Check/Create User
    ↓
localStorage + AuthContext State
    ↓
User Logged In ✅
```

---

## 🎯 Key Features

1. **Instant OTP Screen**: Returns success immediately, MSG91 sends in background
2. **Preloaded Script**: MSG91 script loads on app start for faster OTP sending
3. **Auto-Submit**: OTP auto-submits when 6 digits entered
4. **Resend Cooldown**: 30-second cooldown to prevent spam
5. **Redirect Support**: Can redirect after login (e.g., to checkout)
6. **Phone Normalization**: Handles various formats (+91, 91, 0 prefix)
7. **Error Handling**: Clear error messages at each step
8. **State Management**: Clean separation of concerns (Context, Hook, Components)

---

## 🔐 Security

- Phone validation: 10 digits, starts with 6-9
- OTP validation: Exactly 6 digits
- Account status checks: deleted_at, is_active
- Server-side verification: API validates all inputs
- MSG91 handles actual OTP sending/verification

---

## 📝 Notes

- MSG91 OTP verification is handled client-side via their widget
- Server API creates/logs in users after MSG91 verification
- User data stored in Supabase `user_profiles` table
- Phone numbers stored as 10-digit strings (no +91 in DB)
- Session managed via localStorage + AuthContext state

## ⚠️ Development Warnings

### hCaptcha Localhost Warning
```
[hCaptcha] Warning: localhost detected. Please use a valid host.
```

**This is expected in development** and does not affect functionality:
- MSG91's OTP widget uses hCaptcha for bot protection
- hCaptcha doesn't work on `localhost` (by design)
- The warning is automatically suppressed in development mode
- **In production**, this warning will not appear when using a real domain

**No action needed** - OTP functionality works correctly despite this warning.

