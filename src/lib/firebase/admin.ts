// Optional import to prevent client-side bundling
let admin: any;
export async function getFirebaseAdmin() {
  if (typeof window !== 'undefined') {
    return null;
  }

  if (!admin) {
    try {
      admin = await import('firebase-admin');
      if (!admin.apps?.length) {
        if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
          return null;
        }
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      }
    } catch (error) {
      console.error('Failed to initialize Firebase Admin');
      return null;
    }
  }
  return admin;
}