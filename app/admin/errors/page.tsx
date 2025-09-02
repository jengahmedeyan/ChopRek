import { ErrorDashboard } from "@/components/admin/error-dashboard"
import { PageErrorBoundary } from "@/components/ui/error-boundary-hoc"

export default function ErrorsPage() {
  return (
    <PageErrorBoundary title="Error Dashboard">
      <div className="container mx-auto p-6">
        <ErrorDashboard />
      </div>
    </PageErrorBoundary>
  )
}
