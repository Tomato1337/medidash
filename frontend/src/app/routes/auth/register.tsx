import { Button } from '@/shared/ui/button'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/auth/register')({
    component: RouteComponent,
})

function RouteComponent() {
    return (
        <div>
            Hello "/auth/register"! <Button>Click me</Button>
        </div>
    )
}
