import { RBACManagementDashboard } from "@/components/admin/rbac-management"
import { SuperAdminGuard, AdminGuard } from "@/components/rbac/rbac-guards"
import { PageErrorBoundary } from "@/components/ui/error-boundary-hoc"

export default function RBACPage() {
  return (
    <PageErrorBoundary title="RBAC Management">
      <AdminGuard showFallback={true}>
        <div className="container mx-auto p-6">
          <RBACManagementDashboard />
        </div>
      </AdminGuard>
    </PageErrorBoundary>
  )
}
