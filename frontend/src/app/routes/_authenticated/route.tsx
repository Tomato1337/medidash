import { client } from "@/shared/api/api"
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_authenticated")({
	component: RouteComponent,
	beforeLoad: async ({ context }) => {
		const queryClient = context.queryClient

		try {
			const { data, response } = await client.GET("/api/user")

			if (!response?.ok) {
				console.log("Auth check failed, redirecting to login")
				throw redirect({ to: "/auth/login", replace: true })
			}

			queryClient.setQueryData(["user"], data)

			return data
		} catch (err) {
			// Пробрасываем ошибку дальше для обработки в ErrorBoundary
			throw err
		}
	},
})

function RouteComponent() {
	return (
		<>
			<Outlet />
		</>
	)
}
