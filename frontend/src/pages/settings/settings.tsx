import { SidebarTrigger } from "@/shared/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"

export default function SettingsPage() {
	return (
		<div className="@container space-y-6">
			<div className="flex items-center gap-3">
				<SidebarTrigger />
				<h1 className="text-2xl font-semibold">Настройки профиля</h1>
			</div>

			<Card className="bg-secondary-foreground">
				<CardHeader>
					<CardTitle className="text-accent">
						Параметры аккаунта
					</CardTitle>
				</CardHeader>
				<CardContent className="text-primary-foreground/80 text-sm">
					Здесь будут настройки безопасности, уведомлений и профиля.
				</CardContent>
			</Card>
		</div>
	)
}
