import { SettingsPage } from "@/pages/settings"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
	component: SettingsPage,
})
