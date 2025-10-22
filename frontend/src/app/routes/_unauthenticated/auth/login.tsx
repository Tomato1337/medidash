import { createFileRoute } from "@tanstack/react-router"
import { LoginPage } from "@/pages/auth/login"

export const Route = createFileRoute("/_unauthenticated/auth/login")({
	component: LoginPage,
})
