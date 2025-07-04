import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, getDoc, setDoc } from "firebase/firestore"
import { getDb } from "@/lib/firebase-config"
import type { User } from "@/lib/types"

export async function subscribeToUser(userId: string, callback: (user: User | null) => void) {
  const db = await getDb()
  const userDoc = doc(db, "users", userId)
  return onSnapshot(userDoc, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() } as unknown as User)
    } else {
      callback(null)
    }
  })
}

export async function createUser(user: Omit<User, "id">) {
  const db = await getDb()
  await addDoc(collection(db, "users"), user)
}

export async function updateUser(userId: string, data: Partial<User>) {
  const db = await getDb()
  await updateDoc(doc(db, "users", userId), data)
}

export async function getUserById(userId: string): Promise<User | null> {
  const db = await getDb()
  const userDoc = await getDoc(doc(db, "users", userId))
  if (!userDoc.exists()) return null
  return { id: userDoc.id, ...userDoc.data() } as unknown as User
}

export async function upsertUser(userId: string, data: Partial<User>) {
  const db = await getDb()
  await setDoc(doc(db, "users", userId), data, { merge: true })
}