import { collection, addDoc, query, where, getDocs, updateDoc, doc } from "firebase/firestore"
import { getDb } from "@/lib/firebase-config"

export interface Invitation {
  id?: string
  email: string
  displayName: string
  role: "admin" | "employee"
  department?: string
  invitedBy: string
  invitedAt: Date
  status: "pending" | "accepted" | "expired"
  expiresAt: Date
  inviteMessage?: string
}

export async function createInvitation(invitation: Omit<Invitation, "id" | "invitedAt" | "status" | "expiresAt">) {
  const db = await getDb()
  
  const invitationData = {
    ...invitation,
    invitedAt: new Date(),
    status: "pending" as const,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  }

  const docRef = await addDoc(collection(db, "invitations"), invitationData)
  
  console.log("Invitation created:", docRef.id)
  
  return docRef.id
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
      inviteMessage: data.inviteMessage
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
      inviteMessage: data.inviteMessage
    })
  })
  
  return invitations
}

// Function to check if invitation is expired
export function isInvitationExpired(invitation: Invitation): boolean {
  return new Date() > invitation.expiresAt
}

// Function to resend invitation
export async function resendInvitation(invitationId: string) {
  const db = await getDb()
  
  // Update expiration date to extend the invitation
  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  
  await updateDoc(doc(db, "invitations", invitationId), {
    expiresAt: newExpiresAt
  })
  
  // TODO: Send new invitation email here
  console.log("Invitation resent:", invitationId)
} 