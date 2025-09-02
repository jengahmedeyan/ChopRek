"use client"

import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard"
import { useAuthorization } from "@/hooks/use-authorization"

export default function AdminDashboardPage() {
  const { can, isRole } = useAuthorization();

  if (!isRole("admin") && !can("users:read")) {
    return <div className="p-8 text-center text-red-600 font-bold">Access Denied: You do not have permission to view this page.</div>;
  }

  return <AnalyticsDashboard />
}