import { AccessPage } from "@/pages/access"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_authenticated/dashboard/access")({
	component: AccessPage,
})
