import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const requiredAdminEnvVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY'
] as const;

for (const envVar of requiredAdminEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required Firebase Admin environment variable: ${envVar}`);
  }
}

let app: App;

try {
  if (!getApps().length) {
    app = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
      }),
    });
  } else {
    app = getApps()[0];
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin:', error);
  throw new Error('Firebase Admin initialization failed. Please check your environment variables.');
}

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
export default app;