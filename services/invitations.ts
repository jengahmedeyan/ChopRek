import { collection, addDoc, query, where, getDocs, updateDoc, doc, getDoc, setDoc } from "firebase/firestore"
import { getDb } from "@/lib/firebase-config"
import { Role } from "@/lib/roles"

export interface Invitation {
  id?: string
  email: string
  displayName: string
  role: Role
  department?: string
  invitedBy: string
  invitedAt: Date
  status: "pending" | "accepted" | "expired"
  expiresAt: Date
  inviteMessage?: string
  token?: string
}

export interface InvitationData {
  email: string
  displayName: string
  role: Role
  department?: string
  invitedBy: string
  inviteMessage?: string
  
}

export interface UserData {
  uid: string
  email: string
  displayName: string
  role: "admin" | "employee"
  department?: string
}

export async function createInvitation(invitation: InvitationData) {
  const db = await getDb()
  const token = generateToken()

  const invitationData = {
    ...invitation,
    token,
    invitedAt: new Date(),
    status: "pending" as const,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  }

  const docRef = await addDoc(collection(db, "invitations"), invitationData)

  // Send invitation email
  await sendInvitationEmail({ ...invitationData, id: docRef.id })

  console.log("Invitation created:", docRef.id)

  return docRef.id
}

export async function verifyInvitation(token: string): Promise<Invitation | null> {
  const db = await getDb()
  const invitationsQuery = query(collection(db, "invitations"), where("token", "==", token))
  const snapshot = await getDocs(invitationsQuery)

  if (snapshot.empty) return null

  const doc = snapshot.docs[0]
  const data = doc.data()

  return {
    id: doc.id,
    email: data.email,
    displayName: data.displayName,
    role: data.role,
    department: data.department,
    invitedBy: data.invitedBy,
    invitedAt: data.invitedAt?.toDate?.() || new Date(data.invitedAt),
    status: data.status,
    expiresAt: data.expiresAt?.toDate?.() || new Date(data.expiresAt),
    inviteMessage: data.inviteMessage,
    token: data.token,
  }
}

export async function acceptInvitation(token: string, userData: UserData) {
  const db = await getDb()

  // Find invitation by token
  const invitationsQuery = query(collection(db, "invitations"), where("token", "==", token))
  const snapshot = await getDocs(invitationsQuery)

  if (snapshot.empty) {
    throw new Error("Invitation not found")
  }

  const invitationDoc = snapshot.docs[0]
  const invitationData = invitationDoc.data()

  // Verify invitation is still valid
  if (invitationData.status !== "pending") {
    throw new Error("Invitation has already been used")
  }

  if (new Date() > invitationData.expiresAt.toDate()) {
    throw new Error("Invitation has expired")
  }

  // Update invitation status only
  await updateDoc(invitationDoc.ref, {
    status: "accepted",
    acceptedAt: new Date(),
    acceptedBy: userData.uid
  })

  // Note: User document creation is now handled in the join page
  // before calling this function to ensure proper Firebase Auth flow
  
  return userData
}

export async function getInvitationsByEmail(email: string): Promise<Invitation[]> {
  const db = await getDb()
  const invitationsQuery = query(collection(db, "invitations"), where("email", "==", email))
  const snapshot = await getDocs(invitationsQuery)

  const invitations: Invitation[] = []
  snapshot.forEach((doc) => {
    const data = doc.data()
    invitations.push({
      id: doc.id,
      email: data.email,
      displayName: data.displayName,
      role: data.role,
      department: data.department,
      invitedBy: data.invitedBy,
      invitedAt: data.invitedAt?.toDate?.() || new Date(data.invitedAt),
      status: data.status,
      expiresAt: data.expiresAt?.toDate?.() || new Date(data.expiresAt),
      inviteMessage: data.inviteMessage,
      token: data.token,
    })
  })

  return invitations
}

export async function updateInvitationStatus(invitationId: string, status: "accepted" | "expired") {
  const db = await getDb()
  await updateDoc(doc(db, "invitations", invitationId), { status })
}

export async function getPendingInvitations(): Promise<Invitation[]> {
  const db = await getDb()
  const invitationsQuery = query(collection(db, "invitations"), where("status", "==", "pending"))
  const snapshot = await getDocs(invitationsQuery)

  const invitations: Invitation[] = []
  snapshot.forEach((doc) => {
    const data = doc.data()
    invitations.push({
      id: doc.id,
      email: data.email,
      displayName: data.displayName,
      role: data.role,
      department: data.department,
      invitedBy: data.invitedBy,
      invitedAt: data.invitedAt?.toDate?.() || new Date(data.invitedAt),
      status: data.status,
      expiresAt: data.expiresAt?.toDate?.() || new Date(data.expiresAt),
      inviteMessage: data.inviteMessage,
      token: data.token,
    })
  })

  return invitations
}

export function isInvitationExpired(invitation: Invitation): boolean {
  return new Date() > invitation.expiresAt
}

export async function resendInvitation(invitationId: string) {
  const db = await getDb()

  // Update expiration date to extend the invitation
  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now

  await updateDoc(doc(db, "invitations", invitationId), {
    expiresAt: newExpiresAt,
  })

  // Get invitation data and resend email
  const invitationDoc = await getDoc(doc(db, "invitations", invitationId))
  if (invitationDoc.exists()) {
    const data = invitationDoc.data()
    await sendInvitationEmail({ ...data, id: invitationDoc.id })
  }

  console.log("Invitation resent:", invitationId)
}


async function sendInvitationEmail(invitation: any) {
  try {
    const response = await fetch("/api/send-invitation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ invitation }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to send invitation email")
    }

    const result = await response.json()
    console.log("Email sent successfully:", result)
  } catch (error) {
    console.error("Error sending invitation email:", error)
    throw error
  }
}


function generateToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}
