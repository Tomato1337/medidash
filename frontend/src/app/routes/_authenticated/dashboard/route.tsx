import { AppSidebar } from "@/modules/layout"
import { createFileRoute, Outlet } from "@tanstack/react-router"
import { SidebarInset, SidebarProvider } from "@/shared/ui/sidebar"
import { ViewModeProvider } from "@/modules/shared-access"

export const Route = createFileRoute("/_authenticated/dashboard")({
	// component: () => <HeaderLayout isDashboard={true} />,
	component: () => (
		<ViewModeProvider value={{ type: "owner" }}>
			<SidebarProvider>
				<AppSidebar />
				<SidebarInset className="min-w-0 p-3">
					<Outlet />
				</SidebarInset>
			</SidebarProvider>
		</ViewModeProvider>
	),
})
