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
import { doc, getDoc, setDoc } from "firebase/firestore"
import { auth } from "@/lib/firebase"
import { getDb } from "@/lib/firebase-config"
import type { User } from "@/lib/types"

interface AuthContextType {
  user: User | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  signup: (email: string, password: string, displayName: string, department?: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      try {
        setError(null)
        if (firebaseUser) {
          const db = await getDb()
          const userDocRef = doc(db, "users", firebaseUser.uid)

          try {
            const userDoc = await getDoc(userDocRef)

            if (userDoc.exists()) {
              const userData = userDoc.data()
              setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                role: userData.role || "employee",
                department: userData.department || "",
                createdAt: userData.createdAt?.toDate() || new Date(),
              })
            } else {
              // Create a new user document with default values
              const newUserData = {
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                role: "employee" as const,
                department: "",
                createdAt: new Date(),
              }

              await setDoc(userDocRef, newUserData)

              setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                role: "employee",
                department: "",
                createdAt: new Date(),
              })
            }
          } catch (firestoreError: any) {
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
                await setDoc(userDocRef, newUserData)
                setUser({
                  uid: firebaseUser.uid,
                  email: firebaseUser.email,
                  displayName: firebaseUser.displayName,
                  role: "employee",
                  department: "",
                  createdAt: new Date(),
                })
              } catch (writeError) {
                setError("Error creating user document.")
                console.error("Error creating user document:", writeError)
                setUser(null)
              }
            } else {
              setError("Error fetching user data.")
              console.error("Error fetching user data:", firestoreError)
              setUser(null)
            }
          }
        } else {
          setUser(null)
        }
      } catch (error) {
        setError("Auth state change error.")
        console.error("Auth state change error:", error)
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
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err: any) {
      setError(err.message || "Login failed.")
      throw err
    }
  }

  const loginWithGoogle = async () => {
    setError(null)
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
    } catch (err: any) {
      setError(err.message || "Google login failed.")
      throw err
    }
  }

  const signup = async (email: string, password: string, displayName: string, department?: string) => {
    setError(null)
    try {
      const { createUserWithEmailAndPassword, updateProfile } = await import("firebase/auth")

      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
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
      setError(err.message || "Signup failed.")
      throw err
    }
  }

  const logout = async () => {
    setError(null)
    try {
      await signOut(auth)
    } catch (err: any) {
      setError(err.message || "Logout failed.")
      throw err
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
