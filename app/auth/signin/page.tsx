"use client";

import { useAuth } from "@/lib/auth-context";
import { LoginForm } from "@/components/auth/login-form";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function SignInPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      if (user.role === "admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/employee/menu");
      }
    }
  }, [user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your lunch experience...</p>
          <p className="mt-2 text-sm text-gray-500">
            This should only take a moment
          </p>
        </div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-black-600 to-black-700 shadow-lg mb-4">
            <span className="text-3xl">🍽️</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ChopRek</h1>
          <p className="text-gray-600">Streamline your office lunch ordering</p>
        </div>
        <LoginForm />
        <span className="text-xs mt-4 block">
          Built with ❤️ by
          <Link
            href="https://www.linkedin.com/in/ahmed-eyan-jeng"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Badge
              variant="outline"
              className="ml-2 cursor-pointer hover:bg-blue-100"
            >
              Ahmed Eyan Jeng
            </Badge>
          </Link>
        </span>
      </div>
    </div>
  );
}
