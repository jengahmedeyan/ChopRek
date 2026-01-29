"use client"

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { WifiOff, RefreshCw } from 'lucide-react'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { user, loading, isOffline } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user && !isOffline) {
      router.push('/auth/signin')
    }
  }, [user, loading, isOffline, router])

  if (loading) {
    return fallback || <div>Loading...</div>
  }

  if (isOffline && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-orange-100 rounded-full w-fit">
              <WifiOff className="h-8 w-8 text-orange-600" />
            </div>
            <CardTitle className="text-xl font-bold">You're Offline</CardTitle>
            <CardDescription>
              Please check your internet connection to access ChopRek
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) {
    return fallback || null
  }

  return <>{children}</>
}