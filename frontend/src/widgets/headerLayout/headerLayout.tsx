import { useGetUser } from "@/entities/user"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar"
import { Link, Outlet } from "@tanstack/react-router"

export default function HeaderLayout({
	isDashboard,
}: {
	isDashboard: boolean
}) {
	const { data, isLoading } = useGetUser(isDashboard)
	return (
		<div className="flex h-screen flex-col">
			<div className="flex-shrink-0">
				<div className="flex items-center justify-center gap-4 pt-4">
					<Link to="/dashboard" className="pointer">
						<h1 className="font-syne text-primary text-center text-4xl font-extrabold">
							medidash
						</h1>
					</Link>
					{isDashboard &&
						(isLoading && !data ? (
							<div>Loading...</div>
						) : (
							<Avatar className="size-12 cursor-pointer border transition-transform duration-200 hover:scale-105">
								<AvatarImage />
								<AvatarFallback>{data?.name}</AvatarFallback>
							</Avatar>
						))}
				</div>
				<hr className="relative left-1/2 my-4 w-screen -translate-x-1/2 border-t-2" />
			</div>
			<div className="container mx-auto flex-1">
				<Outlet />
			</div>
		</div>
	)
}
