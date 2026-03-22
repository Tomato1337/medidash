import { createFileRoute } from "@tanstack/react-router"
import DashboardPage from "@/pages/_dashboard/dashboard"

export const Route = createFileRoute("/shared/$token/(sidebar)/dashboard")({
	component: RouteComponent,
})

function RouteComponent() {
	return <DashboardPage />
}
