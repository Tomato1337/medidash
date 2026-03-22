import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import {
	verifySharedAccessSchema,
	verifySharedAccess,
	useSharedAccessInfo,
	type VerifySharedAccessForm,
} from "@/modules/shared-access"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { toast } from "sonner"

export const Route = createFileRoute("/shared/$token/")({
	component: SharedAccessEntryPage,
})

function SharedAccessEntryPage() {
	const { token } = Route.useParams()
	const navigate = useNavigate()
	const { data: accessInfo } = useSharedAccessInfo(token)

	const form = useForm<VerifySharedAccessForm>({
		resolver: zodResolver(verifySharedAccessSchema),
		defaultValues: { password: "" },
	})

	const handleSubmit = form.handleSubmit(async (values) => {
		try {
			await verifySharedAccess(token, values)
			navigate({ to: "/shared/$token/dashboard", params: { token } })
		} catch {
			toast.error("Неверный пароль или доступ истек")
		}
	})

	const status = accessInfo?.status ?? null
	const ownerName = accessInfo?.ownerName ?? null

	return (
		<div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-slate-200 p-6">
			<div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-lg">
				<div className="mb-6 text-center">
					<p className="text-primary text-3xl font-bold">Medidash</p>
					<p className="text-muted-foreground mt-2 text-sm">
						Профиль пользователя {ownerName ?? ""}
					</p>
				</div>

				{status && status !== "active" ? (
					<div className="text-destructive text-center text-sm">
						Доступ {status === "expired" ? "истек" : "отозван"}
					</div>
				) : (
					<form className="space-y-4" onSubmit={handleSubmit}>
						<Input
							type="password"
							placeholder="Введите пароль"
							{...form.register("password")}
						/>
						<Button type="submit" className="w-full">
							Войти
						</Button>
					</form>
				)}
			</div>
		</div>
	)
}
