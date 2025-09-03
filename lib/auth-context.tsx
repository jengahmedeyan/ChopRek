"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import {
  type User as FirebaseUser,
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth"
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore"
import { getAuth } from "@/lib/firebase-config"
import { getDb } from "@/lib/firebase-config"
import type { User } from "@/lib/types"
import { Role } from "@/lib/roles"
import { handleError, logError, isNetworkError } from "@/lib/error-handling"
import { createSession, destroySession } from "@/lib/rbac-middleware"

interface AuthContextType {
  user: User | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  signup: (email: string, password: string, displayName: string, department?: string) => Promise<void>
  logout: () => Promise<void>
  updateUserRole: (userId: string, newRole: Role) => Promise<void>
  updateUserMFA: (enabled: boolean) => Promise<void>
  refreshUserData: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), async (firebaseUser: FirebaseUser | null) => {
      try {
        setError(null)
        
        // Check if we're online before making network requests
        if (!navigator.onLine) {
          console.log("Offline - skipping auth state change")
          setLoading(false)
          return
        }

        if (firebaseUser) {
          try {
            const db = await getDb()
            const userDocRef = doc(db, "users", firebaseUser.uid)

            try {
              const userDoc = await getDoc(userDocRef)

              if (userDoc.exists()) {
                const userData = userDoc.data()
                const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                
                const user: User = {
                  uid: firebaseUser.uid,
                  id: firebaseUser.uid, // Use uid as id
                  email: firebaseUser.email,
                  displayName: firebaseUser.displayName,
                  role: userData.role || "employee",
                  department: userData.department || "",
                  departmentId: userData.departmentId,
                  organizationId: userData.organizationId,
                  createdAt: userData.createdAt?.toDate() || new Date(),
                  updatedAt: userData.updatedAt?.toDate(),
                  lastLoginAt: new Date(),
                  isActive: userData.isActive !== false, // Default to true
                  sessionId: sessionId,
                  mfaEnabled: userData.mfaEnabled || false,
                  mfaVerified: userData.mfaVerified || false,
                  phoneNumber: userData.phoneNumber,
                  avatar: userData.avatar,
                  timezone: userData.timezone,
                  language: userData.language,
                  metadata: userData.metadata
                }
                
                setUser(user)
                
                // Update last login
                await updateDoc(userDocRef, {
                  lastLoginAt: new Date(),
                  sessionId: sessionId
                })
                
                // Create session for middleware
                createSession({
                  userId: user.id,
                  role: user.role as Role,
                  sessionId: sessionId,
                  mfaVerified: user.mfaVerified,
                  ipAddress: undefined, // Will be set by middleware
                  userAgent: navigator.userAgent
                })
              } else {
                // Create a new user document with default values
                const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                const newUserData = {
                  email: firebaseUser.email,
                  displayName: firebaseUser.displayName,
                  role: "employee" as const,
                  department: "",
                  createdAt: new Date(),
                  isActive: true,
                  mfaEnabled: false,
                  lastLoginAt: new Date(),
                  sessionId: sessionId
                }

                await setDoc(userDocRef, newUserData)

                const user: User = {
                  uid: firebaseUser.uid,
                  id: firebaseUser.uid,
                  email: firebaseUser.email,
                  displayName: firebaseUser.displayName,
                  role: "employee",
                  department: "",
                  createdAt: new Date(),
                  isActive: true,
                  sessionId: sessionId,
                  lastLoginAt: new Date(),
                  mfaEnabled: false,
                  mfaVerified: false
                }
                
                setUser(user)
                
                // Create session for middleware
                createSession({
                  userId: user.id,
                  role: user.role as Role,
                  sessionId: sessionId,
                  mfaVerified: false,
                  userAgent: navigator.userAgent
                })
              }
            } catch (firestoreError: any) {
              // Handle specific Firestore errors
              if (firestoreError.code === "permission-denied") {
                // If we can't read the user document, create a minimal one
                const newUserData = {
                  email: firebaseUser.email,
                  displayName: firebaseUser.displayName,
                  role: "employee" as const,
                  department: "",
                  createdAt: new Date(),
                }

                try {
                  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                  await setDoc(userDocRef, newUserData)
                  
                  const user: User = {
                    uid: firebaseUser.uid,
                    id: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName,
                    role: "employee",
                    department: "",
                    createdAt: new Date(),
                    isActive: true,
                    sessionId: sessionId,
                    lastLoginAt: new Date(),
                    mfaEnabled: false,
                    mfaVerified: false
                  }
                  
                  setUser(user)
                  
                  // Create session for middleware
                  createSession({
                    userId: user.id,
                    role: user.role as Role,
                    sessionId: sessionId,
                    mfaVerified: false,
                    userAgent: navigator.userAgent
                  })
                } catch (writeError) {
                  const appError = handleError(writeError, 'user-document-creation')
                  logError(appError)
                  setError(appError.message)
                  setUser(null)
                }
              } else {
                const appError = handleError(firestoreError, 'user-data-fetch')
                logError(appError)
                setError(appError.message)
                setUser(null)
              }
            }
          } catch (networkError: any) {
            // Handle network connectivity issues
            if (isNetworkError(networkError)) {
              console.log("Network error during auth state change:", networkError)
              // Don't set error for network issues, just set loading to false
              setLoading(false)
              return
            }
            throw networkError
          }
        } else {
          setUser(null)
        }
      } catch (error) {
        const appError = handleError(error, 'auth-state-change')
        logError(appError)
        setError(appError.message)
        setUser(null)
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    setError(null)
    try {
      const { signInWithEmailAndPassword } = await import("firebase/auth")
      await signInWithEmailAndPassword(getAuth(), email, password)
    } catch (err: any) {
      const appError = handleError(err, 'login')
      logError(appError)
      setError(appError.message)
      throw new Error(appError.message)
    }
  }

  const loginWithGoogle = async () => {
    setError(null)
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(getAuth(), provider)
    } catch (err: any) {
      const appError = handleError(err, 'google-login')
      logError(appError)
      setError(appError.message)
      throw new Error(appError.message)
    }
  }

  const signup = async (email: string, password: string, displayName: string, department?: string) => {
    setError(null)
    try {
      const { createUserWithEmailAndPassword, updateProfile } = await import("firebase/auth")

      const userCredential = await createUserWithEmailAndPassword(getAuth(), email, password)
      await updateProfile(userCredential.user, { displayName })

      // Create user document in Firestore
      const db = await getDb()
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email,
        displayName,
        role: "employee",
        department: department || "",
        createdAt: new Date(),
      })
    } catch (err: any) {
      const appError = handleError(err, 'signup')
      logError(appError)
      setError(appError.message)
      throw new Error(appError.message)
    }
  }

  const logout = async () => {
    setError(null)
    try {
      // Destroy session in middleware before signing out
      if (user?.sessionId) {
        destroySession(user.sessionId)
      }
      
      // Clear user state
      setUser(null)
      
      // Sign out from Firebase
      await signOut(getAuth())
    } catch (err: any) {
      const appError = handleError(err, 'logout')
      logError(appError)
      setError(appError.message)
      throw new Error(appError.message)
    }
  }

  const updateUserRole = async (userId: string, newRole: Role): Promise<void> => {
    try {
      const db = await getDb()
      const userDocRef = doc(db, 'users', userId)
      await updateDoc(userDocRef, { role: newRole })
      
      if (user && user.uid === userId) {
        setUser({ ...user, role: newRole })
      }
    } catch (error) {
      console.error('Error updating user role:', error)
      throw error
    }
  }

  const updateUserMFA = async (enabled: boolean): Promise<void> => {
    if (!user) throw new Error('No user logged in')
    
    try {
      const db = await getDb()
      const userDocRef = doc(db, 'users', user.uid)
      await updateDoc(userDocRef, { 
        mfaEnabled: enabled,
        mfaVerified: enabled ? false : false
      })
      
      setUser({ 
        ...user, 
        mfaEnabled: enabled,
        mfaVerified: enabled ? false : false
      })
    } catch (error) {
      console.error('Error updating user MFA:', error)
      throw error
    }
  }

  const refreshUserData = async (): Promise<void> => {
    const auth = getAuth()
    if (!auth.currentUser) return
    
    try {
      const db = await getDb()
      const userDocRef = doc(db, 'users', auth.currentUser.uid)
      const userDoc = await getDoc(userDocRef)
      
      if (userDoc.exists()) {
        const userData = userDoc.data()
        setUser({
          uid: auth.currentUser.uid,
          id: auth.currentUser.uid,
          email: auth.currentUser.email,
          displayName: auth.currentUser.displayName,
          role: userData.role || "employee",
          department: userData.department || "",
          createdAt: userData.createdAt?.toDate() || new Date(),
          isActive: userData.isActive ?? true,
          sessionId: userData.sessionId || "",
          lastLoginAt: userData.lastLoginAt?.toDate() || new Date(),
          mfaEnabled: userData.mfaEnabled || false,
          mfaVerified: userData.mfaVerified || false
        })
      }
    } catch (error) {
      console.error('Error refreshing user data:', error)
      throw error
    }
  }

  const value = {
    user,
    loading,
    error,
    login,
    loginWithGoogle,
    signup,
    logout,
    updateUserRole,
    updateUserMFA,
    refreshUserData
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
