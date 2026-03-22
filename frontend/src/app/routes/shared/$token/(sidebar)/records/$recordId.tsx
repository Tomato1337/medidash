import { createFileRoute } from "@tanstack/react-router"
import RecordPage from "@/pages/record/record"

export const Route = createFileRoute(
	"/shared/$token/(sidebar)/records/$recordId",
)({
	component: RouteComponent,
})

function RouteComponent() {
	const { recordId } = Route.useParams()
	return <RecordPage id={recordId} />
}
