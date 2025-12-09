# Admin Setup Instructions

## Setting Admin Status for Phone Number 8881765192

### Method 1: Using API Endpoint (Recommended)

1. **First, make sure the user has logged in at least once** to create a user profile in the database.

2. **Set up the environment variable** (optional, required in production):
   ```bash
   # In your .env.local file
   ADMIN_SETUP_KEY=your-secure-random-key-here
   ```

3. **Call the API endpoint** using curl:

   **Development (no setup key needed):**
   ```bash
   curl -X POST http://localhost:3000/api/admin/set-admin-by-phone \
     -H "Content-Type: application/json" \
     -d '{"phone": "8881765192", "isAdmin": true}'
   ```

   **Production (with setup key):**
   ```bash
   curl -X POST https://your-domain.com/api/admin/set-admin-by-phone \
     -H "Content-Type: application/json" \
     -d '{"phone": "8881765192", "isAdmin": true, "setupKey": "your-setup-key"}'
   ```

### Method 2: Using Node.js Script

```bash
# Make sure you're in the project root directory
node scripts/set-admin.js 8881765192

# Or with setup key
node scripts/set-admin.js 8881765192 your-setup-key
```

### Method 3: Direct Database Update (Advanced)

If you have direct database access, you can run this SQL query:

```sql
UPDATE user_profiles
SET is_admin = true
WHERE phone = '+918881765192';
```

## Verification

After setting admin status, verify it works by:

1. **Refresh the page** (or log out and log back in) - This ensures the admin status is loaded
2. Logging in with phone number 8881765192 (if not already logged in)
3. Check the Account dropdown - you should see "Admin Panel" link
4. Navigating to `/admin` - you should have access
5. The admin status is now checked via the `is_admin` field in the `user_profiles` table

**Note:** After setting admin status via API, you may need to refresh the page for the changes to appear in the UI. The account dropdown will show the "Admin Panel" link once the admin status is detected.

## Important Notes

- The user must have logged in at least once to create a profile before you can set admin status
- In production, always use the `ADMIN_SETUP_KEY` for security
- The phone number should be in format: `8881765192` (10 digits) or `+918881765192` (with country code)
- The system will automatically normalize the phone number format

## Troubleshooting

**Error: "No user found with phone number"**
- Make sure the user has logged in at least once to create a profile
- Check that the phone number is correct and matches the one used during login

**Error: "Setup key required"**
- In production, you must provide a valid `ADMIN_SETUP_KEY`
- Set the key in your `.env.local` file and use it in the API call

**Error: "Invalid setup key"**
- Make sure the `ADMIN_SETUP_KEY` in your environment matches the one in the request
- Check for typos or extra spaces
