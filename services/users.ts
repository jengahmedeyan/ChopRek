import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  getDoc,
  setDoc
} from "firebase/firestore"
import { getDb } from "@/lib/firebase-config"
import { User } from "@/lib/types"

export async function subscribeToUsers(callback: (users: User[]) => void) {
  const db = await getDb()
  const usersQuery = query(collection(db, "users"), orderBy("createdAt", "desc"))
  
  return onSnapshot(usersQuery, (snapshot) => {
    const users: User[] = []
    snapshot.forEach((doc) => {
      const userData = doc.data()
      users.push({
        uid: doc.id,
        id: doc.id,
        email: userData.email,
        displayName: userData.displayName,
        role: userData.role,
        department: userData.department,
        createdAt: userData.createdAt?.toDate?.() || new Date(userData.createdAt),
        isActive: userData.isActive ?? true,
        sessionId: userData.sessionId || "",
        lastLoginAt: userData.lastLoginAt?.toDate?.() || new Date(),
        mfaEnabled: userData.mfaEnabled || false,
        mfaVerified: userData.mfaVerified || false
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
      id: doc.id,
      email: userData.email,
      displayName: userData.displayName,
      role: userData.role,
      department: userData.department,
      createdAt: userData.createdAt?.toDate?.() || new Date(userData.createdAt),
      isActive: userData.isActive ?? true,
      sessionId: userData.sessionId || "",
      lastLoginAt: userData.lastLoginAt?.toDate?.() || new Date(),
      mfaEnabled: userData.mfaEnabled || false,
      mfaVerified: userData.mfaVerified || false
    })
  })
  
  return users
}

export async function deleteUser(userId: string) {
  const db = await getDb()
  await deleteDoc(doc(db, "users", userId))
}

export async function updateUser(userId: string, data: Partial<User>) {
  const db = await getDb()
  await updateDoc(doc(db, "users", userId), data)
}

export async function deactivateUser(userId: string) {
  const db = await getDb()
  await updateDoc(doc(db, "users", userId), { isActive: false })
}

export async function activateUser(userId: string) {
  const db = await getDb()
  await updateDoc(doc(db, "users", userId), { isActive: true })
}

export async function getUserById(userId: string): Promise<User | null> {
  const db = await getDb()
  const userDoc = await getDoc(doc(db, "users", userId))
  if (!userDoc.exists()) return null
  
  const userData = userDoc.data()
  return {
    uid: userDoc.id,
    id: userDoc.id,
    email: userData.email,
    displayName: userData.displayName,
    role: userData.role,
    department: userData.department,
    createdAt: userData.createdAt?.toDate?.() || new Date(userData.createdAt),
    isActive: userData.isActive ?? true,
    sessionId: userData.sessionId || "",
    lastLoginAt: userData.lastLoginAt?.toDate?.() || new Date(),
    mfaEnabled: userData.mfaEnabled || false,
    mfaVerified: userData.mfaVerified || false
  }
}

export async function upsertUser(userId: string, data: Partial<User>) {
  const db = await getDb()
  await setDoc(doc(db, "users", userId), data, { merge: true })
}

export async function getUsersByDepartment(department: string): Promise<User[]> {
  const db = await getDb()
  const usersQuery = query(
    collection(db, "users"), 
    where("department", "==", department),
    orderBy("createdAt", "desc")
  )
  const snapshot = await getDocs(usersQuery)
  
  const users: User[] = []
  snapshot.forEach((doc) => {
    const userData = doc.data()
    users.push({
      uid: doc.id,
      id: doc.id,
      email: userData.email,
      displayName: userData.displayName,
      role: userData.role,
      department: userData.department,
      createdAt: userData.createdAt?.toDate?.() || new Date(userData.createdAt),
      isActive: userData.isActive ?? true,
      sessionId: userData.sessionId || "",
      lastLoginAt: userData.lastLoginAt?.toDate?.() || new Date(),
      mfaEnabled: userData.mfaEnabled || false,
      mfaVerified: userData.mfaVerified || false
    })
  })
  
  return users
}

export async function getUsersByRole(role: string): Promise<User[]> {
  const db = await getDb()
  const usersQuery = query(
    collection(db, "users"),
    where("role", "==", role),
    orderBy("createdAt", "desc")
  )
  const snapshot = await getDocs(usersQuery)
  
  const users: User[] = []
  snapshot.forEach((doc) => {
    const userData = doc.data()
    users.push({
      uid: doc.id,
      id: doc.id,
      email: userData.email,
      displayName: userData.displayName,
      role: userData.role,
      department: userData.department,
      createdAt: userData.createdAt?.toDate?.() || new Date(userData.createdAt),
      isActive: userData.isActive ?? true,
      sessionId: userData.sessionId || "",
      lastLoginAt: userData.lastLoginAt?.toDate?.() || new Date(),
      mfaEnabled: userData.mfaEnabled || false,
      mfaVerified: userData.mfaVerified || false
    })
  })
  
  return users
}

export async function createUser(userData: Partial<User>) {
  const db = await getDb()
  const userRef = doc(collection(db, "users"))
  await setDoc(userRef, {
    ...userData,
    id: userRef.id,
    createdAt: new Date(),
    isActive: true,
    sessionId: "",
    lastLoginAt: new Date(),
    mfaEnabled: false,
    mfaVerified: false
  })
  return userRef.id
}

export async function createUserAccount(userData: Partial<User>) {
  return createUser(userData)
}
