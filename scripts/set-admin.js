/**
 * Script to set admin status for a user by phone number
 * 
 * Usage:
 *   node scripts/set-admin.js <phone-number> [setup-key]
 * 
 * Example:
 *   node scripts/set-admin.js 8881765192
 *   node scripts/set-admin.js 8881765192 your-setup-key
 * 
 * Note: In production, you need to set ADMIN_SETUP_KEY in your .env file
 */

const phone = process.argv[2];
const setupKey = process.argv[3];

if (!phone) {
  console.error('Error: Phone number is required');
  console.log('Usage: node scripts/set-admin.js <phone-number> [setup-key]');
  process.exit(1);
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const url = `${baseUrl}/api/admin/set-admin-by-phone`;

const body = {
  phone: phone,
  isAdmin: true,
  ...(setupKey && { setupKey: setupKey })
};

console.log(`Setting admin status for phone: ${phone}`);
console.log(`Calling: ${url}`);

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
})
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log('✅ Success:', data.message);
      console.log('Profile:', JSON.stringify(data.profile, null, 2));
    } else {
      console.error('❌ Error:', data.error);
      if (data.details) {
        console.error('Details:', data.details);
      }
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Request failed:', error.message);
    process.exit(1);
  });
