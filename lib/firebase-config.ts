"use client"

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app"
import type { Firestore } from "firebase/firestore"
import type { FirebaseStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

export const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig)

// Lazy initialization for browser-only services
let _db: Firestore | null = null
let _storage: FirebaseStorage | null = null

export const getDb = async (): Promise<Firestore> => {
  if (typeof window === "undefined") {
    throw new Error("Firestore can only be used in the browser")
  }

  if (!_db) {
    const { getFirestore } = await import("firebase/firestore")
    _db = getFirestore(app)
  }

  return _db
}

export const getStorage = async (): Promise<FirebaseStorage> => {
  if (typeof window === "undefined") {
    throw new Error("Storage can only be used in the browser")
  }

  if (!_storage) {
    const { getStorage: getFirebaseStorage } = await import("firebase/storage")
    _storage = getFirebaseStorage(app)
  }

  return _storage
}

// Legacy exports for backward compatibility
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
