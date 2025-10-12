import { Card } from '@/shared/ui/card'
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/auth/login')({
    component: RouteComponent,
})

function RouteComponent() {
    return (
        <div className="flex items-center justify-between">
            <Card></Card>
            <Outlet />
        </div>
    )
}
