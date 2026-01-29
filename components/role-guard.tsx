"use client"

import { useAuth } from '@/lib/auth-context'
import type { Role } from '@/lib/roles'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { WifiOff, RefreshCw } from 'lucide-react'

interface RoleGuardProps {
  allowedRoles: Role[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function RoleGuard({ allowedRoles, children, fallback }: RoleGuardProps) {
  const { user, loading, isOffline } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user && !isOffline && !allowedRoles.includes(user.role)) {
      // Redirect based on user role
      const redirectPath = user.role === 'admin' ? '/admin/dashboard' : '/employee/menu'
      router.push(redirectPath)
    }
  }, [user, loading, isOffline, allowedRoles, router])

  if (loading) {
    return fallback || <div>Loading...</div>
  }

  if (isOffline) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-orange-100 rounded-full w-fit">
              <WifiOff className="h-8 w-8 text-orange-600" />
            </div>
            <CardTitle className="text-xl font-bold">You're Offline</CardTitle>
            <CardDescription>
              Some features may be limited while offline. Please reconnect to access all features.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reconnect
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return fallback || null
  }

  return <>{children}</>
}