import { DashboardPage } from "@/pages/_dashboard"
import { recordsFiltersSchema } from "@/modules/records"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_authenticated/dashboard/")({
	validateSearch: (search: Record<string, unknown>) => recordsFiltersSchema.parse(search),
	component: RouteComponent,
})

function RouteComponent() {
	return <DashboardPage />
}
