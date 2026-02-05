import { getUser } from "@/modules/auth"
import { client } from "@/shared/api/api"
import { queryKeys } from "@/shared/api/queries"
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_authenticated")({
	component: RouteComponent,
	scrollRestoration: true,
	pendingComponent: () => (
		<div className="flex min-h-screen items-center justify-center">
			<div className="text-center">
				<div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-gray-900"></div>
				<p className="mt-4 text-gray-600">Загрузка...</p>
			</div>
		</div>
	),
	loader: async ({ context }) => {
		try {
			const queryClient = context.queryClient
			const data = await getUser()

			// if (!response?.ok || error) {
			// 	console.log("Auth check failed, redirecting to login")
			// 	throw redirect({ to: "/auth/login", replace: true })
			// }
			queryClient.setQueryData(queryKeys.auth.user(), data)

			return data
		} catch (error) {
			console.log("Auth check failed, redirecting to login")
			throw redirect({ to: "/auth/login", replace: true })
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
