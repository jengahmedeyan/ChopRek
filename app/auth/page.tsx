import { redirect } from "next/navigation"

export default function AuthRedirectPage() {
  redirect("/auth/signin")
  return null
}