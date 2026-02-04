import { cn } from "../lib/utils"
import { Badge } from "./badge"
import { Skeleton } from "./skeleton"
import { DocumentStatus, type DocumentStatusValues } from "@shared-types"
interface SkeletonTagsProps {
	count?: number
	className?: string
	status?: DocumentStatusValues | undefined
}
export function SkeletonTags({
	count = Math.floor(Math.random() * 5) + 1,
	className,
	status,
}: SkeletonTagsProps) {
	return (
		<div
			className={cn(
				`flex w-full items-center gap-2 overflow-auto`,
				className,
			)}
		>
			{Array.from({ length: count }).map((_, id) => (
				<Badge
					key={id}
					variant="secondary"
					className="border-primary text-primary bg-primary/10 h-6 w-16 rounded-full border"
				>
					<Skeleton
						className={cn(
							"bg-accent-foreground h-2 w-full rounded-lg",
							{
								"bg-destructive animate-none":
									status === DocumentStatus.FAILED,
							},
						)}
					/>
				</Badge>
			))}
		</div>
	)
}
