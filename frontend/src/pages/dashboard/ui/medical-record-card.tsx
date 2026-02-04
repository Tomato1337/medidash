import { Card } from "@/shared/ui/card"
import { Badge } from "@/shared/ui/badge"
import { cn, formatDate } from "@/shared/lib/utils"
import { File, Clock } from "lucide-react"
import { Link } from "@tanstack/react-router"
import { type DocumentStatusValues, DocumentStatus } from "@shared-types"
import { Skeleton } from "@/shared/ui/skeleton"
import { StatusBadgeFactory } from "@/entities/document/ui/status"
import { SkeletonTags } from "@/shared/ui/skeletonTags"
import { Button } from "@/shared/ui/button"
import { RefreshCw, Loader2 } from "lucide-react"

interface MedicalRecordCardProps {
	id: string
	title: string
	summary: string | undefined
	tags: any[]
	filesCount: number
	date: string | Date | undefined
	status?: DocumentStatusValues
	failedPhase?: string | null
	onDelete?: () => void
	onRetry?: () => void
	isRetrying?: boolean
	className?: string
}

export function MedicalRecordCard({
	id,
	title,
	summary,
	tags,
	filesCount,
	date,
	status = DocumentStatus.PROCESSING,
	failedPhase,
	onRetry,
	isRetrying,
	className,
}: MedicalRecordCardProps) {
	return (
		<Link to="/dashboard/$id" params={{ id }}>
			<Card
				className={cn(
					"bg-background border-primary relative cursor-pointer gap-2 overflow-hidden border-2 p-5 shadow-sm transition-transform hover:scale-[100.5%] hover:shadow-md",
					className,
				)}
			>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						{<StatusBadgeFactory status={status} />}
						{status === DocumentStatus.FAILED && onRetry && (
							<Button
								variant="ghost"
								size="icon"
								className="h-6 w-6 hover:bg-transparent"
								disabled={isRetrying}
								onClick={(e) => {
									e.preventDefault()
									e.stopPropagation()
									onRetry()
								}}
							>
								{isRetrying ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									<RefreshCw className="h-4 w-4" />
								)}
							</Button>
						)}
					</div>
				</div>

				<h3 className="text-foreground text-base leading-tight font-semibold">
					{!title
						? // <Skeleton className="bg-accent-foreground h-4 w-full rounded-lg" />
							"Новый документ"
						: title}
				</h3>

				<div className="text-foreground line-clamp-4 text-sm leading-relaxed">
					{!summary ? (
						<div className="flex flex-col gap-[2px]">
							{Array.from({ length: 4 }).map((_, id) => (
								<Skeleton
									key={id}
									className={cn(
										"bg-accent-foreground h-4 rounded-lg",
										{
											"bg-destructive animate-none":
												status ===
												DocumentStatus.FAILED,
										},
									)}
									style={{
										width: `${Math.floor(Math.random() * (100 - 60 + 1)) + 60}%`,
									}}
								/>
							))}
						</div>
					) : (
						summary
					)}
				</div>

				{tags && tags.length > 0 ? (
					<div className="flex flex-wrap gap-2">
						{tags.map((tag, index) => (
							<Badge
								key={index}
								variant="secondary"
								className="border-primary text-primary bg-primary/10 rounded-full border px-3 py-1 text-xs font-normal"
							>
								{typeof tag === "string" ? tag : tag.name}
							</Badge>
						))}
					</div>
				) : (
					<SkeletonTags status={status} />
				)}

				<div className="text-foreground flex items-center gap-4 text-xs">
					<div className="flex items-center gap-1.5">
						<File className="h-4 w-4" />
						<span>{filesCount} файлов</span>
					</div>
					<div className="flex items-center gap-1.5">
						<Clock className="h-4 w-4" />
						<span>
							{formatDate(new Date(date || new Date()).getTime())}
						</span>
					</div>
				</div>
			</Card>
		</Link>
	)
}
