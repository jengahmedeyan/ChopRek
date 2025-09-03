import { cookies } from 'next/headers'
import { adminAuth } from '@/lib/firebase-admin'
import type { DecodedIdToken } from 'firebase-admin/auth'
import type { Role } from '@/lib/roles'

export async function getServerUser(): Promise<DecodedIdToken | null> {
  try {
    const cookieStore = cookies()
    const sessionCookie = (await cookieStore).get('session')?.value

    if (!sessionCookie) {
      return null
    }

    // Verify the session cookie
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true)
    return decodedClaims
  } catch (error) {
    console.error('Failed to verify session:', error)
    return null
  }
}

export async function requireAuth(): Promise<DecodedIdToken> {
  const user = await getServerUser()
  if (!user) {
    throw new Error('Authentication required')
  }
  return user
}

export async function requireRole(allowedRoles: Role[]): Promise<DecodedIdToken> {
  const user = await requireAuth()
  const userRole = user.role as Role || 'employee'
  
  if (!allowedRoles.includes(userRole)) {
    throw new Error(`Access denied: ${allowedRoles.join(' or ')} role required`)
  }
  
  return user
}

// Helper functions for specific role checks
export async function requireAdmin(): Promise<DecodedIdToken> {
  return requireRole(['admin'])
}

export async function requireAdminOrCaterer(): Promise<DecodedIdToken> {
  return requireRole(['admin', 'caterer'])
}

export async function getUserRole(): Promise<Role> {
  const user = await getServerUser()
  return (user?.role as Role) || 'employee'
}