"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { Mail, CheckCircle, XCircle, Loader2 } from "lucide-react"

export default function JoinPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [invitation, setInvitation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRegistering, setIsRegistering] = useState(false)
  const [registrationComplete, setRegistrationComplete] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  })

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError("Invalid invitation link")
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/verify-invitation?token=${token}`)
        const result = await response.json()

        if (!response.ok) {
          setError(result.error || "Failed to verify invitation")
          setLoading(false)
          return
        }

        const invitationData = result.invitation

        if (!invitationData) {
          setError("Invitation not found or has expired")
        } else if (invitationData.status === "accepted") {
          setError("This invitation has already been used")
        } else if (new Date() > new Date(invitationData.expiresAt)) {
          setError("This invitation has expired")
        } else {
          setInvitation({
            ...invitationData,
            expiresAt: new Date(invitationData.expiresAt)
          })
        }
      } catch (error) {
        console.error("Error verifying invitation:", error)
        setError("Failed to verify invitation")
      } finally {
        setLoading(false)
      }
    }

    verifyToken()
  }, [token])

  const handleRegistration = async () => {
    if (!invitation) return

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      })
      return
    }

    if (formData.password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      })
      return
    }

    setIsRegistering(true)

    try {
      // Use server-side API for account creation
      const response = await fetch('/api/accept-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: invitation.email,
          password: formData.password,
          token: token,
          displayName: invitation.displayName,
          role: invitation.role,
          department: invitation.department,
          invitationId: invitation.id
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create account')
      }

      setRegistrationComplete(true)
      toast({
        title: "Welcome!",
        description: "Your account has been created successfully",
      })
    } catch (error: any) {
      console.error("Error creating account:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create account",
        variant: "destructive",
      })
    } finally {
      setIsRegistering(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Verifying invitation...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => (window.location.href = "/")}>
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (registrationComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle>Welcome to the Team!</CardTitle>
            <CardDescription>
              Your account has been created successfully. You can now sign in and start using the platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => (window.location.href = "/auth/signin")}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Mail className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <CardTitle>Join Your Team</CardTitle>
          <CardDescription>
            You've been invited to join as a {invitation?.role} in the {invitation?.department || "team"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              <strong>Email:</strong> {invitation?.email}
              <br />
              <strong>Name:</strong> {invitation?.displayName}
              <br />
              <strong>Role:</strong> {invitation?.role}
              <br />
              {invitation?.department && (
                <>
                  <strong>Department:</strong> {invitation.department}
                </>
              )}
            </AlertDescription>
          </Alert>

          {invitation?.inviteMessage && (
            <Alert>
              <AlertDescription>
                <strong>Personal Message:</strong>
                <br />
                {invitation.inviteMessage}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Create Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter your password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Confirm your password"
              />
            </div>
          </div>

          <Button
            className="w-full"
            onClick={handleRegistration}
            disabled={isRegistering || !formData.password || !formData.confirmPassword}
          >
            {isRegistering ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              "Create Account & Join Team"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
