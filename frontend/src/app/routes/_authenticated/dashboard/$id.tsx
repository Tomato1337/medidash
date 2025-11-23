import { RecordPage } from "@/pages/record"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_authenticated/dashboard/$id")({
	component: RouteComponent,
})

function RouteComponent() {
	const params = Route.useParams()
	return <RecordPage id={params.id} />
}
