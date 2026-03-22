import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarSeparator,
} from "@/shared/ui/sidebar"
import { Link, useLocation, useNavigate } from "@tanstack/react-router"
import { ShieldCheckIcon, SearchIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { getUser } from "@/modules/auth"

interface GuestSidebarProps {
	ownerName: string | null
	sharedToken: string
}

export function GuestSidebar({ ownerName, sharedToken }: GuestSidebarProps) {
	const { pathname } = useLocation()
	const navigate = useNavigate()
	const [currentUser, setCurrentUser] = useState<
		{ name: string; email: string } | null
	>(null)

	useEffect(() => {
		getUser()
			.then((user) => {
				setCurrentUser({ name: user.name, email: user.email })
			})
			.catch(() => {
				setCurrentUser(null)
			})
	}, [])

	const handleSwitchToOwner = () => {
		navigate({ to: "/dashboard" })
	}

	const dashboardPath = `/shared/${sharedToken}/dashboard`

	return (
		<Sidebar variant="inset" collapsible="icon">
			<SidebarHeader className="h-20 px-5 py-7.5">
				<Link
					to={dashboardPath}
					className="text-sidebar-primary-foreground relative flex items-center gap-3 group-data-[collapsible=icon]:justify-center"
				>
					<span className="font-syne text-primary text-center text-3xl leading-none font-extrabold">
						M
					</span>
					<span className="font-syne text-accent absolute top-1.5 left-12 text-2xl leading-none font-extrabold group-data-[collapsible=icon]:hidden">
						edidash
					</span>
				</Link>
			</SidebarHeader>

			<SidebarSeparator className="mx-0" />

			<SidebarContent>
				<SidebarGroup className="py-6">
					<SidebarGroupContent>
						<SidebarMenu className="gap-2">
							<SidebarMenuItem>
								<SidebarMenuButton
									asChild
									isActive={pathname === dashboardPath}
									tooltip="Документы"
									className="h-12 rounded-xl px-3 text-base font-medium"
								>
									<Link to={dashboardPath} className="gap-3">
										<ShieldCheckIcon className="size-6!" />
										<span>Документы</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton
									asChild
									isActive={false}
									tooltip="Поиск"
									className="h-12 rounded-xl px-3 text-base font-medium"
								>
									<span className="flex gap-3">
										<SearchIcon className="size-6!" />
										<span>Поиск</span>
									</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter className="pb-2 group-data-[collapsible=icon]:p-1">
				<SidebarSeparator className="mx-0 mb-1" />
				<SidebarMenu>
					<SidebarMenuItem>
						<div className="px-3 py-2">
							<p className="text-xs text-muted-foreground">Гостевой доступ</p>
							<p className="text-sm font-medium">
								{ownerName ?? "Профиль"}
							</p>
						</div>
					</SidebarMenuItem>
					{currentUser && (
						<SidebarMenuItem>
							<SidebarMenuButton
								onClick={handleSwitchToOwner}
								className="h-12 rounded-xl px-3 text-base font-medium"
							>
								<div className="flex flex-col items-start">
									<span className="text-xs text-muted-foreground">
										Мой аккаунт
									</span>
									<span className="text-sm font-medium">
										{currentUser.name}
									</span>
									<span className="text-xs text-muted-foreground">
										{currentUser.email}
									</span>
								</div>
							</SidebarMenuButton>
						</SidebarMenuItem>
					)}
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	)
}
