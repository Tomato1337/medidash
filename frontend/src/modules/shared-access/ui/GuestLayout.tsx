import { type ReactNode } from "react"
import { SidebarInset, SidebarProvider } from "@/shared/ui/sidebar"
import { ViewModeProvider } from "../application/viewModeContext"
import { AppSidebar } from "@/modules/layout"
import {
	useSharedAccessInfo,
	useSharedCheckAuth,
} from "../application/useSharedAccess"

interface GuestLayoutProps {
	token: string
	children: ReactNode
}

/**
 * Layout wrapper for all guest (shared-access) pages.
 *
 * Responsibilities:
 * - Verifies that the shared link still exists (redirects to password page on failure)
 * - Provides ViewModeContext with guest mode
 * - Renders GuestSidebar + SidebarInset
 */
export function GuestLayout({ token, children }: GuestLayoutProps) {
	useSharedCheckAuth(token)
	const { data: accessInfo } = useSharedAccessInfo(token)

	return (
		<ViewModeProvider
			value={{ type: "guest", token, ownerId: accessInfo?.ownerId || "" }}
		>
			<SidebarProvider>
				<AppSidebar ownerName={accessInfo?.ownerName || ""} />
				<SidebarInset className="min-w-0 p-3">{children}</SidebarInset>
			</SidebarProvider>
		</ViewModeProvider>
	)
}
