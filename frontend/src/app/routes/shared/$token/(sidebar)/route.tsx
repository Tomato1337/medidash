import { Outlet, createFileRoute } from "@tanstack/react-router"
import { GuestLayout } from "@/modules/shared-access"

export const Route = createFileRoute("/shared/$token/(sidebar)")({
	component: () => {
		const { token } = Route.useParams()

		return (
			<GuestLayout token={token}>
				<Outlet />
			</GuestLayout>
		)
	},
})
