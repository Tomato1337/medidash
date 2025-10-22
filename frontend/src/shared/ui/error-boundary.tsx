import { Link, type ErrorComponentProps } from "@tanstack/react-router"
import { Button } from "./button"

export function ErrorBoundary({ error }: ErrorComponentProps) {
	return (
		<div className="bg-background flex min-h-screen items-center justify-center p-4">
			<div className="w-full max-w-md space-y-4 text-center">
				<div className="space-y-2">
					<h1 className="text-destructive text-4xl font-bold tracking-tighter">
						Что-то пошло не так
					</h1>
					<p className="text-muted-foreground">
						Произошла непредвиденная ошибка. Мы уже работаем над её
						исправлением.
					</p>
				</div>

				{error && (
					<div className="border-destructive/50 bg-destructive/10 rounded-lg border p-4">
						<p className="text-destructive font-mono text-sm">
							{error instanceof Error
								? error.message
								: String(error)}
						</p>
					</div>
				)}

				<div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
					<Button asChild variant="default">
						<Link to="/dashboard">Вернуться на главную</Link>
					</Button>
					<Button
						variant="outline"
						onClick={() => window.location.reload()}
					>
						Перезагрузить страницу
					</Button>
				</div>
			</div>
		</div>
	)
}
