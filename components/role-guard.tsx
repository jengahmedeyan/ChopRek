"use client"

import { useAuth } from '@/lib/auth-context'
import type { Role } from '@/lib/roles'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface RoleGuardProps {
  allowedRoles: Role[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function RoleGuard({ allowedRoles, children, fallback }: RoleGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user && !allowedRoles.includes(user.role)) {
      // Redirect based on user role
      const redirectPath = user.role === 'admin' ? '/admin/dashboard' : '/employee/menu'
      router.push(redirectPath)
    }
  }, [user, loading, allowedRoles, router])

  if (loading) {
    return fallback || <div>Loading...</div>
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return fallback || null
  }

  return <>{children}</>
}