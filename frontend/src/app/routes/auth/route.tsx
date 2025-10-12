import { createFileRoute, Link, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/auth')({
    component: RouteComponent,
})

function RouteComponent() {
    return (
        <div className="container mx-auto p-2">
            <Link to="/dashboard" className="pointer">
                <h1 className="font-syne font-extrabold text-4xl text-primary text-center pt-4">
                    medidash
                </h1>
            </Link>
            <hr className="my-4 w-screen relative left-1/2 -translate-x-1/2 border-t-2" />
            <Outlet />
        </div>
    )
}
