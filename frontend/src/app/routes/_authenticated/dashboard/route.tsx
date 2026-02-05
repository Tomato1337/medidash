import { HeaderLayout } from "@/modules/layout"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { client } from "@/shared/api/api"

export const Route = createFileRoute("/_authenticated/dashboard")({
	component: () => <HeaderLayout isDashboard={true} />,
})
