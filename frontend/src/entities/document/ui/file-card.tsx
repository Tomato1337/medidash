import { File, Download, RefreshCw } from "lucide-react"
import { Button } from "@/shared/ui/button"
import { Badge } from "@/shared/ui/badge"
import { type DocumentStatusValues, DocumentStatus } from "@shared-types"
import { StatusBadgeFactory } from "./status"

interface FileCardProps {
	fileName: string
	fileSize?: string
	status?: DocumentStatusValues
	onDownload?: () => void
	onRetry?: () => void
}

export function FileCard({
	fileName,
	fileSize,
	status = "UPLOADING",
	onDownload,
}: FileCardProps) {
	return (
		<div className="bg-background flex items-center justify-between rounded-lg border p-4 shadow-sm">
			<div className="flex items-center gap-3">
				<div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg">
					<File className="text-primary h-6 w-6" aria-hidden="true" />
				</div>
				<div>
					<h3 className="text-foreground font-medium">{fileName}</h3>
					<div className="mt-1 flex items-center gap-2">
						{fileSize && (
							<span className="text-muted-foreground text-xs">
								{fileSize}
							</span>
						)}
						<StatusBadgeFactory status={status} />
					</div>
				</div>
			</div>
			<div className="flex items-center gap-2">
				{status === DocumentStatus.COMPLETED && onDownload && (
					<Button
						variant="ghost"
						size="icon"
						onClick={onDownload}
						className="hover:bg-primary/10"
						aria-label={`Скачать файл ${fileName}`}
					>
						<Download className="h-4 w-4" aria-hidden="true" />
					</Button>
				)}
			</div>
		</div>
	)
}
