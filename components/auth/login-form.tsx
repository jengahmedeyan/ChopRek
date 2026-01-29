"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/lib/auth-context"
import { Eye, EyeOff, Mail, Lock, AlertCircle, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export function LoginForm() {
  const { login, loginWithGoogle, loading, error } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    setFormError("")
    setIsSubmitting(true)
    try {
      await login(email, password)
    } catch (error: any) {
      setFormError(error.message || "Invalid email or password")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full shadow-xl border-0">
      <CardHeader className="space-y-2 pb-6 text-center">
        <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
        <CardDescription className="text-base">
          Sign in to your account to continue
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {formError && (
            <Alert variant="destructive" className="py-3">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-11 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                required
                autoComplete="email"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-gray-700">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 h-11 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                required
                autoComplete="current-password"
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 text-base font-semibold transition-colors"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Need access?{" "}
            <span className="font-medium text-gray-900">Contact your administrator</span>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
