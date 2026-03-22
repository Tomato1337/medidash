import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_authenticated/dashboard/test")({
	component: RouteComponent,
})

function RouteComponent() {
	return <div>Hello "/_authenticated/dashssssssssssssboard/test"!</div>
}
