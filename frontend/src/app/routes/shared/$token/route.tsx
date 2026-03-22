import { useSharedCheckAuth } from "@/modules/shared-access"
import {
	createFileRoute,
	Navigate,
	Outlet,
	useLocation,
	useNavigate,
} from "@tanstack/react-router"

export const Route = createFileRoute("/shared/$token")({
	component: RouteComponent,
})

function RouteComponent() {
	const { token } = Route.useParams()
	const location = useLocation()
	const {
		data: isAuthorized,
		isLoading,
		isError,
	} = useSharedCheckAuth(token, true)

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-gray-900"></div>
					<p className="mt-4 text-gray-600">Загрузка...</p>
				</div>
			</div>
		)
	}

	if (
		!isLoading &&
		isAuthorized &&
		location.pathname === `/shared/${token}`
	) {
		return <Navigate to="/shared/$token/dashboard" params={{ token }} />
	}

	return (
		<>
			<Outlet />
		</>
	)
}
