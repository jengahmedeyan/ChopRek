import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      email, 
      password, 
      token, 
      displayName,
      role,
      department,
      invitationId 
    } = body

    if (!email || !password || !token || !displayName || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Step 1: Verify the invitation is still valid
    const invitationsRef = adminDb.collection('invitations')
    const invitationQuery = await invitationsRef.where('token', '==', token).get()

    if (invitationQuery.empty) {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 404 }
      )
    }

    const invitationDoc = invitationQuery.docs[0]
    const invitationData = invitationDoc.data()

    // Check if invitation is still pending
    if (invitationData.status !== 'pending') {
      return NextResponse.json(
        { error: 'Invitation has already been used or expired' },
        { status: 400 }
      )
    }

    // Check if invitation has expired
    const expiresAt = invitationData.expiresAt?.toDate ? 
      invitationData.expiresAt.toDate() : 
      invitationData.expiresAt?._seconds ? 
        new Date(invitationData.expiresAt._seconds * 1000) : 
        new Date(invitationData.expiresAt)
    
    if (new Date() > expiresAt) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      )
    }

    // Step 2: Create Firebase Auth user (or get existing if already created)
    let userRecord
    try {
      userRecord = await adminAuth.createUser({
        email,
        password,
        displayName,
      })
    } catch (authError: any) {
      if (authError.code === 'auth/email-already-exists') {
        // Check if this user was created for this invitation
        try {
          userRecord = await adminAuth.getUserByEmail(email)
          
          // Check if this user already has a Firestore document
          const existingUserDoc = await adminDb.collection('users').doc(userRecord.uid).get()
          if (existingUserDoc.exists) {
            const existingData = existingUserDoc.data()
            if (existingData?.metadata?.invitationId === invitationDoc.id) {
              // This invitation was already processed successfully
              return NextResponse.json(
                { error: 'This invitation has already been processed' },
                { status: 400 }
              )
            } else {
              // User exists but from different source
              return NextResponse.json(
                { error: 'An account with this email already exists' },
                { status: 400 }
              )
            }
          }
          // User exists in Auth but not in Firestore, continue with Firestore creation
        } catch (getUserError) {
          throw authError // Re-throw original error if we can't get user
        }
      } else {
        throw authError // Re-throw for other auth errors
      }
    }

    // Step 3: Create Firestore user document with admin privileges
    const userData = {
      uid: userRecord.uid,
      id: userRecord.uid,
      email,
      displayName,
      role,
      department: department || null,
      permissions: [], // Will be populated based on role
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
      profile: {
        firstName: displayName.split(' ')[0] || displayName,
        lastName: displayName.split(' ').slice(1).join(' ') || '',
        phone: '',
        avatar: null,
        bio: '',
        preferences: {
          notifications: {
            email: true,
            push: true,
            sms: false
          },
          theme: 'light',
          language: 'en'
        }
      },
      metadata: {
        source: 'invitation',
        invitationId: invitationDoc.id,
        invitedBy: invitationData.invitedBy || 'unknown',
        invitedAt: invitationData.invitedAt ? (
          invitationData.invitedAt.toDate ? 
            invitationData.invitedAt.toDate() : 
            invitationData.invitedAt._seconds ? 
              new Date(invitationData.invitedAt._seconds * 1000) : 
              new Date(invitationData.invitedAt)
        ) : new Date()
      }
    }
    
    await adminDb.collection('users').doc(userRecord.uid).set(userData)

    // Step 4: Update invitation status to accepted
    await adminDb.collection('invitations').doc(invitationDoc.id).update({
      status: 'accepted',
      acceptedAt: new Date(),
      acceptedBy: userRecord.uid,
      updatedAt: new Date()
    })

    return NextResponse.json({
      success: true,
      user: {
        uid: userRecord.uid,
        email,
        displayName,
        role,
        department
      }
    })

  } catch (error: any) {
    console.error('Error in accept-invitation API:', error)
    
    // Handle specific Firebase Auth errors
    if (error.code === 'auth/invalid-email') {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }
    
    if (error.code === 'auth/weak-password') {
      return NextResponse.json(
        { error: 'Password is too weak' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create account' },
      { status: 500 }
    )
  }
}
