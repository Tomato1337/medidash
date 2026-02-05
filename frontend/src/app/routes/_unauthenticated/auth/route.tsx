import { HeaderLayout } from "@/modules/layout"
import { createFileRoute, Link, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/_unauthenticated/auth")({
	component: () => <HeaderLayout isDashboard={false} />,
})
