import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    const invitationsQuery = adminDb.collection('invitations').where('token', '==', token)
    const snapshot = await invitationsQuery.get()

    if (snapshot.empty) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    const doc = snapshot.docs[0]
    const data = doc.data()

    if (data.status !== 'pending') {
      return NextResponse.json(
        { error: 'Invitation has already been used' },
        { status: 400 }
      )
    }

    if (new Date() > data.expiresAt.toDate()) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      )
    }

    const invitation = {
      id: doc.id,
      email: data.email,
      displayName: data.displayName,
      role: data.role,
      department: data.department,
      invitedBy: data.invitedBy,
      invitedAt: data.invitedAt?.toDate?.()?.toISOString() || new Date(data.invitedAt).toISOString(),
      status: data.status,
      expiresAt: data.expiresAt?.toDate?.()?.toISOString() || new Date(data.expiresAt).toISOString(),
      inviteMessage: data.inviteMessage,
      token: data.token,
    }

    return NextResponse.json({ invitation })

  } catch (error) {
    console.error('Error verifying invitation:', error)
    return NextResponse.json(
      { error: 'Failed to verify invitation' },
      { status: 500 }
    )
  }
}
