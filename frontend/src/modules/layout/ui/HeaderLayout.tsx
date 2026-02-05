import { useUser } from "@/modules/auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar"
import { Link, Outlet } from "@tanstack/react-router"

interface HeaderLayoutProps {
	isDashboard: boolean
}

export function HeaderLayout({ isDashboard }: HeaderLayoutProps) {
	const { data, isLoading } = useUser(isDashboard)

	return (
		<div
			id="main-scroll-container"
			className="flex h-screen flex-col overflow-x-hidden"
		>
			<div className="flex-shrink-0">
				<div className="flex items-center justify-center gap-4 pt-4">
					<Link to="/dashboard" className="cursor-pointer">
						<h1 className="font-syne text-primary text-center text-4xl font-extrabold">
							medidash
						</h1>
					</Link>
					{isDashboard &&
						(isLoading && !data ? (
							<div>Loading...</div>
						) : (
							<Avatar
								className="size-12 cursor-pointer border transition-transform duration-200 hover:scale-105 motion-reduce:transform-none"
								aria-label="Профиль пользователя"
							>
								<AvatarImage />
								<AvatarFallback>{data?.name}</AvatarFallback>
							</Avatar>
						))}
				</div>
				<hr className="relative left-1/2 my-4 w-screen -translate-x-1/2 border-t-2" />
			</div>
			<div className="container mx-auto min-h-[calc(100vh-100px)] w-full p-4">
				<Outlet />
			</div>
		</div>
	)
}
