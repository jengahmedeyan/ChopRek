import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    const { token, role } = await request.json()

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 400 })
    }

    const decodedToken = await adminAuth.verifyIdToken(token)
    
    if (role) {
      await adminAuth.setCustomUserClaims(decodedToken.uid, { role })
    }
    
    const expiresIn = 60 * 60 * 24 * 5 * 1000 // 5 days
    const sessionCookie = await adminAuth.createSessionCookie(token, { expiresIn })

    const response = NextResponse.json({ success: true })
    response.cookies.set('session', sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Session creation failed:', error)
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete('session')
  return response
}