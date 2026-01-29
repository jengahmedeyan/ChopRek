"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/lib/auth-context"
import { Eye, EyeOff, User, Mail, Lock, Briefcase, AlertCircle, Loader2 } from "lucide-react"

export function SignUpForm() {
  const { signup } = useAuth()
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
    department: "",
    position: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError("")

    if (formData.password !== formData.confirmPassword) {
      setFormError("Passwords do not match")
      return
    }

    if (formData.password.length < 6) {
      setFormError("Password should be at least 6 characters long")
      return
    }

    setIsSubmitting(true)
    try {
      await signup(formData.email, formData.password, formData.displayName)
    } catch (error: any) {
      setFormError(error.message || "Failed to create account")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Card className="w-full shadow-xl border-0">
      <CardHeader className="space-y-2 pb-6 text-center">
        <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
        <CardDescription className="text-base">
          Join ChopRek to start ordering lunch
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-sm font-medium text-gray-700">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="displayName"
                  placeholder="John Doe"
                  value={formData.displayName}
                  onChange={(e) => handleInputChange("displayName", e.target.value)}
                  className="pl-10 h-11 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  required
                  autoComplete="name"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="pl-10 h-11 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  required
                  autoComplete="email"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  className="pl-10 pr-10 h-11 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  required
                  autoComplete="new-password"
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                  className="pl-10 pr-10 h-11 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  required
                  autoComplete="new-password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="department" className="text-sm font-medium text-gray-700">Department <span className="text-gray-500">(Optional)</span></Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="department"
                  placeholder="Engineering"
                  value={formData.department}
                  onChange={(e) => handleInputChange("department", e.target.value)}
                  className="pl-10 h-11 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="position" className="text-sm font-medium text-gray-700">Position <span className="text-gray-500">(Optional)</span></Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="position"
                  placeholder="Software Developer"
                  value={formData.position}
                  onChange={(e) => handleInputChange("position", e.target.value)}
                  className="pl-10 h-11 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 text-base font-semibold  transition-colors"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creating account...
              </>
            ) : (
              "Create account"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <a href="/auth/signin" className="font-medium text-blue-600 hover:text-blue-700">
              Sign in
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
