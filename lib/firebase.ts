// lib/firebase.ts
// Ensures we never initialize Firebase more than once
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"

// IMPORTANT: keep all Firebase imports from the same major version
// to avoid "Component … has not been registered yet" runtime errors.

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Initialise (or reuse) the default app
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig)

// Export typed singletons
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

export default app
