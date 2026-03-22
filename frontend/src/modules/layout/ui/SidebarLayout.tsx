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
import {
	ArrowDownUpIcon,
	BotIcon,
	Grid2x2Icon,
	InfoIcon,
	LogOutIcon,
	SettingsIcon,
	ShieldCheckIcon,
	User2Icon,
} from "lucide-react"
import { Link, useLocation, useNavigate } from "@tanstack/react-router"
import { useLogout, useUser } from "@/modules/auth"
import { Skeleton } from "@/shared/ui/skeleton"
import { useViewMode } from "@/modules/shared-access"

const generateToUrl = (
	guestAccess: boolean,
	path: string,
	token: string | undefined,
) => {
	if (guestAccess && token) {
		return `/shared/${token}${path}`
	} else {
		return path
	}
}

const mainMenuItems = [
	{
		label: "Документы",
		icon: Grid2x2Icon,
		to: function (token: string) {
			return generateToUrl(this.guestAccess, "/dashboard", token)
		},
		guestAccess: true,
	},
	{
		label: "Статистика",
		icon: InfoIcon,
		to: function (token: string) {
			return generateToUrl(this.guestAccess, "/dashboard", token)
		},
		guestAccess: true,
	},
	{
		label: "AI Ассистент",
		icon: BotIcon,
		to: function (token: string) {
			return generateToUrl(this.guestAccess, "/dashboard", token)
		},
		guestAccess: true,
	},
]

const profileActionItems = [
	{
		label: "Доступы",
		icon: ShieldCheckIcon,
		to: function (token: string) {
			return generateToUrl(this.guestAccess, "/dashboard/access", token)
		},
		guestAccess: false,
	},
	{
		label: "Настройки",
		icon: SettingsIcon,
		to: function (token: string) {
			return generateToUrl(this.guestAccess, "/dashboard/settings", token)
		},
		guestAccess: false,
	},
]

export function AppSidebar({ ownerName }: { ownerName: string }) {
	const { type, token, ownerId } = useViewMode()
	const { pathname } = useLocation()
	const navigate = useNavigate()
	const logout = useLogout()
	const {
		data: userData,
		isLoading: isUserLoading,
		isError: isUserError,
	} = useUser(true, type === "guest")

	const handleLogout = () => {
		if (logout.isPending) return

		logout.mutate(undefined, {
			onSuccess: () => {
				navigate({ to: "/auth/login" })
			},
		})
	}

	const filteredMenuItems = mainMenuItems.filter(
		(item) => item.guestAccess || type === "owner",
	)
	const filteredProfileActionItems = profileActionItems.filter(
		(item) => item.guestAccess || type === "owner",
	)

	console.log(
		type,
		type === "guest" && ownerId === userData?.id,
		ownerId,
		userData?.id,
		userData,
		"Owner id" + ownerId,
	)

	return (
		<Sidebar variant="inset" collapsible="icon">
			<SidebarHeader className="h-20 px-5 py-7.5">
				<Link
					to={generateToUrl(type === "guest", "/dashboard", token)}
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
							{filteredMenuItems.map((item) => {
								const url = item.to(token)
								console.log(url)
								const isActive =
									pathname === url ||
									(url === "/dashboard" &&
										pathname === "/dashboard/")

								return (
									<SidebarMenuItem key={item.label}>
										<SidebarMenuButton
											asChild
											isActive={isActive}
											tooltip={item.label}
											className="h-12 rounded-xl px-3 text-base font-medium group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:pl-5!"
										>
											<Link to={url} className="gap-3">
												<item.icon className="size-6!" />
												<span>{item.label}</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								)
							})}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter className="pb-2 group-data-[collapsible=icon]:p-1">
				<SidebarMenu className="">
					{filteredProfileActionItems.map((item) => (
						<SidebarMenuItem key={item.label}>
							<SidebarMenuButton
								asChild
								isActive={pathname === item.to(token)}
								tooltip={item.label}
								className="h-12 rounded-xl px-3 text-base font-medium group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:pl-5!"
							>
								<Link to={item.to(token)} className="gap-3">
									<item.icon className="size-6!" />
									<span>{item.label}</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					))}
					{type === "owner" && (
						<SidebarMenuItem>
							<SidebarMenuButton
								tooltip="Выйти"
								onClick={handleLogout}
								disabled={logout.isPending}
								className="h-12 rounded-xl px-3 text-base font-medium group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:pl-5!"
							>
								<LogOutIcon className="size-6!" />
								<span>Выйти</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					)}
				</SidebarMenu>

				<SidebarSeparator className="mx-0 mb-1" />

				<SidebarMenu>
					<SidebarMenuItem>
						{(type === "owner" ||
							(type === "guest" && ownerId === userData?.id)) && (
							<SidebarMenuButton
								tooltip="Профиль"
								asChild
								onClick={() => {
									if (type === "guest") {
										navigate({ to: `/dashboard` })
									}
								}}
								className="h-16 cursor-pointer rounded-xl px-3 group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0!"
							>
								<div className="flex w-full flex-col justify-center">
									<div className="flex w-full items-center gap-2">
										{isUserLoading ? (
											<Skeleton className="bg-accent-foreground h-10 w-10 rounded-full" />
										) : (
											<span className="border-sidebar-ring text-sidebar-primary-foreground inline-flex size-10 items-center justify-center rounded-full border-2 bg-white/90 text-base font-semibold group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:text-sm">
												{userData?.name
													.slice(0, 2)
													.toUpperCase() || "IY"}
											</span>
										)}
										<span className="flex min-w-0 flex-1 flex-col text-left group-data-[collapsible=icon]:hidden">
											{isUserLoading ? (
												<Skeleton className="bg-accent-foreground h-4 w-full rounded-lg" />
											) : (
												<span className="truncate text-base leading-none font-semibold">
													{userData?.name || "Ilya"}
												</span>
											)}
											{isUserLoading ? (
												<Skeleton className="bg-accent-foreground mt-1 h-3 w-3/4 rounded-lg" />
											) : (
												<span className="text-sidebar-foreground/70 truncate text-sm">
													{userData?.email ||
														"ilya@example.com"}
												</span>
											)}
										</span>
										{type === "owner" && (
											<button
												type="button"
												onClick={handleLogout}
												disabled={logout.isPending}
												className="text-sidebar-foreground/70 hover:text-sidebar-foreground ml-auto inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors group-data-[collapsible=icon]:hidden disabled:pointer-events-none disabled:opacity-60"
												aria-label="Выйти"
											>
												<LogOutIcon className="size-4.5" />
											</button>
										)}
									</div>
								</div>
							</SidebarMenuButton>
						)}
						{type === "guest" && ownerId === userData?.id && (
							<div className="flex w-full items-center justify-center">
								<ArrowDownUpIcon className="size-6!" />
							</div>
						)}
						{type === "guest" && (
							<SidebarMenuButton
								tooltip="Профиль"
								asChild
								className="h-16 cursor-pointer rounded-xl px-3 group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0!"
							>
								<div className="flex w-full flex-col justify-center">
									<div className="flex w-full items-center gap-2">
										<span className="border-sidebar-ring text-sidebar-primary-foreground inline-flex size-10 items-center justify-center rounded-full border-2 bg-white/90 text-base font-semibold group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:text-sm">
											<User2Icon className="text-primary size-5!" />
										</span>
										<span className="flex min-w-0 flex-1 flex-col text-left group-data-[collapsible=icon]:hidden">
											<span className="truncate text-base leading-none font-semibold">
												{userData?.name || "Ilya"}
											</span>
											<span className="text-sidebar-foreground/70 truncate text-sm">
												Режим гостя
											</span>
										</span>
									</div>
								</div>
							</SidebarMenuButton>
						)}
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	)
}
