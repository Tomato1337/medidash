import { Link } from "@tanstack/react-router"
import { Button } from "./button"

export function NotFound() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-4">
			<div className="w-full max-w-md space-y-4 text-center">
				<div className="space-y-2">
					<h1 className="text-6xl font-bold tracking-tighter">404</h1>
					<h2 className="text-2xl font-semibold">
						Страница не найдена
					</h2>
					<p className="text-muted-foreground">
						К сожалению, запрашиваемая страница не существует или была
						перемещена.
					</p>
				</div>

				<div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
					<Button asChild variant="default">
						<Link to="/dashboard">Вернуться на главную</Link>
					</Button>
				</div>
			</div>
		</div>
	)
}
