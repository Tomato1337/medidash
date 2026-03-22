import { createFileRoute } from "@tanstack/react-router"
import DashboardPage from "@/pages/_dashboard/dashboard"
import { recordsFiltersSchema } from "@/modules/records"

export const Route = createFileRoute("/shared/$token/(sidebar)/dashboard")({
	validateSearch: (search: Record<string, unknown>) => recordsFiltersSchema.parse(search),
	component: RouteComponent,
})

function RouteComponent() {
	return <DashboardPage />
}
