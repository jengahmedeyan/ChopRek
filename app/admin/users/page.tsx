"use client"

import { UserManagement } from "@/components/admin/user-management"
import { useAuthorization } from "@/hooks/use-authorization";

export default function AdminUsersPage() {
   const { can, isRole } = useAuthorization();
  
    if (!isRole("admin") && !can("users:read")) {
      return <div className="p-8 text-center text-red-600 font-bold">Access Denied: You do not have permission to view this page.</div>;
    }
  return <UserManagement />
}