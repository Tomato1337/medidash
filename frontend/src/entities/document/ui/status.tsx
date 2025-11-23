import { cn } from "@/shared/lib/utils"
import { DocumentStatus, type DocumentStatusValues } from "@shared-types"
import { cva, type VariantProps } from "class-variance-authority"

const badgeVariants = cva(
	"flex items-center gap-1.5 rounded-full border px-3 py-1 transition-colors",
	{
		variants: {
			variant: {
				default: "border-transparent",
			},
			status: {
				[DocumentStatus.COMPLETED]: "",
				[DocumentStatus.FAILED]: "",
				[DocumentStatus.PROCESSING]: "",
				[DocumentStatus.UPLOADING]: "",
				[DocumentStatus.COMPRESSING]: "",
				[DocumentStatus.PENDING]: "",
			},
		},
		compoundVariants: [
			{
				variant: "default",
				status: DocumentStatus.COMPLETED,
				class: "bg-primary text-primary-foreground hover:bg-primary/80",
			},
			{
				variant: "default",
				status: DocumentStatus.FAILED,
				class: "bg-destructive text-destructive-foreground hover:bg-destructive/80",
			},
			{
				variant: "default",
				status: DocumentStatus.PROCESSING,
				class: "bg-primary text-primary-foreground animate-pulse",
			},
			{
				variant: "default",
				status: DocumentStatus.UPLOADING,
				class: "bg-blue-500 text-white hover:bg-blue-500/80",
			},
			{
				variant: "default",
				status: DocumentStatus.COMPRESSING,
				class: "bg-orange-500 text-white hover:bg-orange-500/80",
			},
			{
				variant: "default",
				status: DocumentStatus.PENDING,
				class: "bg-orange-500 text-white hover:bg-orange-500/80",
			},
		],
		defaultVariants: {
			variant: "default",
			status: DocumentStatus.COMPRESSING,
		},
	},
)

const statusText: Record<string, string> = {
	[DocumentStatus.COMPLETED]: "готово",
	[DocumentStatus.FAILED]: "ошибка",
	[DocumentStatus.PROCESSING]: "обработка",
	[DocumentStatus.UPLOADING]: "загрузка",
	[DocumentStatus.COMPRESSING]: "сжатие",
	[DocumentStatus.PENDING]: "ожидание",
}

export interface StatusBadgeProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof badgeVariants> {
	status: DocumentStatusValues
}

export function StatusBadgeFactory({
	status,
	className,
	variant,
	...props
}: StatusBadgeProps) {
	// Fallback for unknown statuses
	const safeStatus = Object.values(DocumentStatus).includes(status)
		? status
		: DocumentStatus.COMPRESSING

	return (
		<div
			className={cn(
				badgeVariants({ variant, status: safeStatus }),
				className,
			)}
			{...props}
		>
			<div className="h-2 w-2 rounded-full bg-current" />
			<span className="text-xs font-medium">
				{statusText[safeStatus] || "сжатие"}
			</span>
		</div>
	)
}
