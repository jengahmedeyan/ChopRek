import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, getDoc, setDoc, getDocs, deleteDoc, orderBy } from "firebase/firestore"
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

export async function subscribeToUsers(callback: (users: User[]) => void) {
  const db = await getDb()
  const usersQuery = query(collection(db, "users"), orderBy("createdAt", "desc"))
  
  return onSnapshot(usersQuery, (snapshot) => {
    const users: User[] = []
    snapshot.forEach((doc) => {
      const userData = doc.data()
      users.push({
        uid: doc.id,
        email: userData.email,
        displayName: userData.displayName,
        role: userData.role,
        department: userData.department,
        createdAt: userData.createdAt?.toDate?.() || new Date(userData.createdAt)
      })
    })
    callback(users)
  })
}

export async function getAllUsers(): Promise<User[]> {
  const db = await getDb()
  const usersQuery = query(collection(db, "users"), orderBy("createdAt", "desc"))
  const snapshot = await getDocs(usersQuery)
  
  const users: User[] = []
  snapshot.forEach((doc) => {
    const userData = doc.data()
    users.push({
      uid: doc.id,
      email: userData.email,
      displayName: userData.displayName,
      role: userData.role,
      department: userData.department,
      createdAt: userData.createdAt?.toDate?.() || new Date(userData.createdAt)
    })
  })
  
  return users
}

export async function createUser(user: Omit<User, "uid">) {
  const db = await getDb()
  const userData = {
    ...user,
    createdAt: new Date()
  }
  await addDoc(collection(db, "users"), userData)
}

export async function updateUser(userId: string, data: Partial<User>) {
  const db = await getDb()
  await updateDoc(doc(db, "users", userId), data)
}

export async function deleteUser(userId: string) {
  const db = await getDb()
  await deleteDoc(doc(db, "users", userId))
}

export async function getUserById(userId: string): Promise<User | null> {
  const db = await getDb()
  const userDoc = await getDoc(doc(db, "users", userId))
  if (!userDoc.exists()) return null
  
  const userData = userDoc.data()
  return {
    uid: userDoc.id,
    email: userData.email,
    displayName: userData.displayName,
    role: userData.role,
    department: userData.department,
    createdAt: userData.createdAt?.toDate?.() || new Date(userData.createdAt)
  }
}

export async function upsertUser(userId: string, data: Partial<User>) {
  const db = await getDb()
  await setDoc(doc(db, "users", userId), data, { merge: true })
}

export async function getUsersByRole(role: "admin" | "employee"): Promise<User[]> {
  const db = await getDb()
  const usersQuery = query(collection(db, "users"), where("role", "==", role))
  const snapshot = await getDocs(usersQuery)
  
  const users: User[] = []
  snapshot.forEach((doc) => {
    const userData = doc.data()
    users.push({
      uid: doc.id,
      email: userData.email,
      displayName: userData.displayName,
      role: userData.role,
      department: userData.department,
      createdAt: userData.createdAt?.toDate?.() || new Date(userData.createdAt)
    })
  })
  
  return users
}

export async function getUsersByDepartment(department: string): Promise<User[]> {
  const db = await getDb()
  const usersQuery = query(collection(db, "users"), where("department", "==", department))
  const snapshot = await getDocs(usersQuery)
  
  const users: User[] = []
  snapshot.forEach((doc) => {
    const userData = doc.data()
    users.push({
      uid: doc.id,
      email: userData.email,
      displayName: userData.displayName,
      role: userData.role,
      department: userData.department,
      createdAt: userData.createdAt?.toDate?.() || new Date(userData.createdAt)
    })
  })
  
  return users
}