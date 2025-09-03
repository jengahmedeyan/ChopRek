"use client"

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app"
import { getAuth as getFirebaseAuth, type Auth } from "firebase/auth"
import type { Firestore } from "firebase/firestore"
import type { FirebaseStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
}

function validateAndGetConfig() {
  const requiredVars = [
    { key: 'NEXT_PUBLIC_FIREBASE_API_KEY', value: firebaseConfig.apiKey },
    { key: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', value: firebaseConfig.authDomain },
    { key: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID', value: firebaseConfig.projectId },
    { key: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', value: firebaseConfig.storageBucket },
    { key: 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', value: firebaseConfig.messagingSenderId },
    { key: 'NEXT_PUBLIC_FIREBASE_APP_ID', value: firebaseConfig.appId },
  ]

  const missingVars = requiredVars.filter(env => !env.value || env.value.trim() === '')
  
  if (missingVars.length > 0) {
    const missingKeys = missingVars.map(env => env.key).join(', ')
    throw new Error(
      `Firebase configuration incomplete. Missing or empty variables: ${missingKeys}.\n\n` +
      `Please ensure your .env.local file contains all required Firebase environment variables.\n\n` +
      `Current status:\n${requiredVars.map(v => `  ${v.key}: ${v.value ? '✅ Set' : '❌ Missing/Empty'}`).join('\n')}`
    )
  }
  
  return firebaseConfig
}

let _app: FirebaseApp | null = null
let _auth: Auth | null = null
let _db: Firestore | null = null
let _storage: FirebaseStorage | null = null


function getFirebaseApp(): FirebaseApp {
  if (typeof window === "undefined") {
    throw new Error("Firebase can only be initialized in the browser")
  }

  if (!_app) {
    const config = validateAndGetConfig()
    _app = getApps().length ? getApp() : initializeApp(config)
  }

  return _app
}

export function getAuth(): Auth {
  if (typeof window === "undefined") {
    throw new Error("Firebase Auth can only be used in the browser")
  }

  if (!_auth) {
    _auth = getFirebaseAuth(getFirebaseApp())
  }

  return _auth
}

export async function getDb(): Promise<Firestore> {
  if (typeof window === "undefined") {
    throw new Error("Firestore can only be used in the browser")
  }

  if (!_db) {
    const { getFirestore } = await import("firebase/firestore")
    _db = getFirestore(getFirebaseApp())
  }

  return _db
}

export async function getStorage(): Promise<FirebaseStorage> {
  if (typeof window === "undefined") {
    throw new Error("Firebase Storage can only be used in the browser")
  }

  if (!_storage) {
    const { getStorage: getFirebaseStorage } = await import("firebase/storage")
    _storage = getFirebaseStorage(getFirebaseApp())
  }

  return _storage
}

export const app = (() => {
  if (typeof window === "undefined") return null
  try {
    return getFirebaseApp()
  } catch {
    return null
  }
})()

export const auth = (() => {
  if (typeof window === "undefined") return null
  try {
    return getAuth()
  } catch {
    return null
  }
})()

export const db = new Proxy({} as Firestore, {
  get() {
    throw new Error("Use getDb() instead of db for async Firestore access")
  },
})

export const storage = new Proxy({} as FirebaseStorage, {
  get() {
    throw new Error("Use getStorage() instead of storage for async Storage access")
  },
})
