import { Badge } from "./badge"
import { Skeleton } from "./skeleton"
interface SkeletonTagsProps {
	count?: number
	className?: string
}
export function SkeletonTags({
	count = Math.floor(Math.random() * 5) + 1,
	className,
}: SkeletonTagsProps) {
	return (
		<div
			className={`flex w-full items-center gap-2 overflow-auto ${className}`}
		>
			{Array.from({ length: count }).map((_, id) => (
				<Badge
					key={id}
					variant="secondary"
					className="border-primary text-primary bg-primary/10 h-6 w-16 rounded-full border"
				>
					<Skeleton className="bg-accent-foreground h-2 w-full rounded-lg" />
				</Badge>
			))}
		</div>
	)
}
