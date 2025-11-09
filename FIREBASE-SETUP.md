# Firebase Phone Authentication Setup Guide

## Current Issue
Firebase phone authentication requires either:
1. **Billing enabled** (Blaze plan) - for production
2. **Test phone numbers** - for development/testing

## Option 1: Set Up Test Phone Numbers (Recommended for Development)

### Steps:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `project-8b4ecf9d-f470-49ef-a29`
3. Navigate to: **Authentication** → **Sign-in method** → **Phone**
4. Scroll down to **"Phone numbers for testing"** section
5. Click **"Add phone number"**
6. Add test numbers (examples):
   - **Phone**: `+16505551234` → **Code**: `123456`
   - **Phone**: `+919876543210` → **Code**: `654321`
   - **Phone**: `+911234567890` → **Code**: `111111`
7. Click **"Save"**

### How to Use:
- In your app, enter one of the test phone numbers (e.g., `+16505551234`)
- When prompted for OTP, enter the corresponding test code (e.g., `123456`)
- No real SMS will be sent, and it works without billing

---

## Option 2: Enable Billing (Required for Production)

### Steps:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `project-8b4ecf9d-f470-49ef-a29`
3. Click the **gear icon (⚙️)** next to "Project Overview"
4. Select **"Usage and billing"**
5. Click **"Modify plan"** or **"Upgrade"**
6. Select **"Blaze plan"** (pay-as-you-go)
7. Complete the billing setup

### Cost Information:
- **Blaze Plan**: Pay-as-you-go (includes free tier)
- **Phone SMS**: ~$0.06 per SMS (varies by country)
- **Free Tier**: Includes some free SMS per month
- You only pay for usage beyond free limits

---

## After Setup

1. **Wait 1-2 minutes** for changes to propagate
2. **Restart your development server**:
   ```bash
   npm run dev
   ```
3. **Test authentication**:
   - If using test numbers: Use a test phone number
   - If billing enabled: Use any real phone number

---

## Troubleshooting

### Still getting billing error?
- Make sure you've either:
  - Added test phone numbers AND are using one of them, OR
  - Enabled billing in Firebase Console
- Wait a few minutes after making changes
- Restart your development server
- Clear browser cache

### Test phone numbers not working?
- Verify the phone number format matches exactly (including country code)
- Check that the test code matches what you configured
- Ensure you saved the test numbers in Firebase Console

---

## Current Firebase Configuration

Your Firebase project is configured with:
- **Project ID**: `project-8b4ecf9d-f470-49ef-a29`
- **Auth Domain**: `project-8b4ecf9d-f470-49ef-a29.firebaseapp.com`

Environment variables are set in `.env.local`

