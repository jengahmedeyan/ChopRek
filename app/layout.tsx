import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/lib/auth-context"
import { Toaster } from "@/components/ui/toaster"
import ServiceWorkerRegistration from "@/components/service-worker"
import { GlobalErrorBoundary } from "@/components/ui/error-boundary-hoc"
import { setupGlobalErrorHandling } from "@/lib/error-monitoring"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ChopRek",
  description: "Office lunch ordering app for employees and caterers",
  manifest: "/manifest.json",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#000000",
}

// Initialize global error handling
if (typeof window !== 'undefined') {
  setupGlobalErrorHandling()
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <GlobalErrorBoundary>
          <AuthProvider>
            {children}
            <Toaster />
            <ServiceWorkerRegistration />
          </AuthProvider>
        </GlobalErrorBoundary>
      </body>
    </html>
  )
}
