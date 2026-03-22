import { documentDownloadMutationOptions } from "@/modules/documents"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { FileCard } from "@/modules/documents"
import { Markdown } from "@/shared/ui/markdown"
import {
	Loader2,
	ArrowLeft,
	Edit2,
	Trash2,
	Clock,
	RefreshCcw,
} from "lucide-react"
import { useNavigate, useLocation, useRouter } from "@tanstack/react-router"
import { Skeleton } from "@/shared/ui/skeleton"
import { StatusBadge } from "@/modules/documents"
import { SkeletonTags } from "@/shared/ui/skeletonTags"
import { DocumentStatus, type DocumentStatusValues } from "@shared-types"
import { cn, formatDate } from "@/shared/lib/utils"
import {
	isLocalRecord,
	subscribeToRecordProcessing,
	useRetryRecord,
	useRecord,
	type DisplayRecord,
} from "@/modules/records"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo } from "react"
import { SidebarTrigger } from "@/shared/ui/sidebar"
import { useViewMode, getSharedDocumentDownloadUrl } from "@/modules/shared-access"
import { getSharedRecord } from "@/modules/shared-access/infrastructure/sharedRecordsApi"
import { toDisplayRecord } from "@/modules/records"

interface RecordPageProps {
	id?: string
}

export default function RecordPage({ id }: RecordPageProps) {
	const queryClient = useQueryClient()
	const navigate = useNavigate()
	const location = useLocation()
	const router = useRouter()
	const viewMode = useViewMode()
	const isGuest = viewMode.type === "guest"

	// Build guest data source only when in guest mode
	const guestDataSource = useMemo(() => {
		if (viewMode.type !== "guest" || !id) return undefined
		const token = viewMode.token
		return {
			queryKey: ["record", id, "shared", token],
			queryFn: async () => {
				const raw = await getSharedRecord(token, id)
				return toDisplayRecord(raw)
			},
		}
	// stable for the provider's lifetime
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isGuest, id, isGuest && viewMode.type === "guest" ? viewMode.token : ""])

	const { data: record, isLoading, isError } = useRecord(id || "", guestDataSource)
	const retryRecord = useRetryRecord()
	const documentDownloadMutation = useMutation(
		documentDownloadMutationOptions(),
	)

	useEffect(() => {
		if (!record || isGuest) return

		const unsubscribe = subscribeToRecordProcessing(record.id || "", {
			allStatus: () => {
				queryClient.invalidateQueries({
					queryKey: ["record", record.id],
				})
				queryClient.invalidateQueries({
					queryKey: ["records"],
				})
			},
		})

		return () => {
			unsubscribe()
		}
	}, [record, isGuest, queryClient])

	const handleRetry = (record: DisplayRecord) => {
		if (!record.failedPhase) return
		retryRecord.mutate({
			recordId: record.id,
			phase: record.failedPhase,
		})
	}

	const handleDownloadFile = (documentId: string) => {
		if (isGuest && viewMode.type === "guest") {
			getSharedDocumentDownloadUrl(viewMode.token, documentId)
				.then((data) => {
					const { downloadUrl } = data
					const link = document.createElement("a")
					link.target = "_blank"
					link.href = downloadUrl || ""
					link.download = ""
					document.body.appendChild(link)
					link.click()
					link.remove()
				})
				.catch(() => null)
			return
		}
		documentDownloadMutation.mutate(documentId, {
			onSuccess: (data) => {
				const { downloadUrl } = data
				const link = document.createElement("a")
				link.target = "_blank"
				link.href = downloadUrl || ""
				link.download = ""
				document.body.appendChild(link)
				link.click()
				link.remove()
			},
		})
	}

	const handleBack = () => {
		// @ts-expect-error - state is unknown
		if (location.state?.from) {
			router.history.back()
			return
		}
		if (isGuest && viewMode.type === "guest") {
			navigate({ to: "/shared/$token/dashboard", params: { token: viewMode.token } })
			return
		}
		navigate({ to: "/dashboard" })
	}

	if (!id) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<p className="text-muted-foreground">ID записи не указан</p>
			</div>
		)
	}

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<Loader2 className="text-primary h-8 w-8 animate-spin" />
			</div>
		)
	}

	if (isError || !record) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center gap-4">
				<p className="text-destructive text-lg">Запись не найдена</p>
				<Button
					onClick={() =>
						isGuest && viewMode.type === "guest"
							? navigate({ to: "/shared/$token/dashboard", params: { token: viewMode.token } })
							: navigate({ to: "/dashboard" })
					}
				>
					Вернуться на главную
				</Button>
			</div>
		)
	}

	const isLocal = isLocalRecord(record)
	const canRetry =
		!isGuest &&
		record.status === DocumentStatus.FAILED &&
		(isLocal || record.failedPhase)

	const formatFileSize = (bytes: number) => {
		if (bytes < 1024) return `${bytes} B`
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
	}

	return (
		<div className="mx-auto w-full">
			{/* Хедер */}
			<div className="bg-accent sticky top-0 z-10 mb-6 flex flex-wrap items-center gap-3 border-b px-3 py-4">
				{!isGuest && <SidebarTrigger />}

				<Button
					variant="ghost"
					onClick={handleBack}
					className="gap-2"
					aria-label="Назад к списку записей"
				>
					<ArrowLeft className="h-4 w-4" aria-hidden="true" />
					Назад
				</Button>
				{isLocal && (
					<Badge
						variant="outline"
						className="border-yellow-500 bg-yellow-500/10 text-yellow-700"
					>
						Локальная запись
					</Badge>
				)}
			</div>

			{/* Основная информация */}
			<div className="bg-background mb-6 space-y-3 rounded-xl border p-6 shadow-sm">
				<div className="flex gap-2">
					<StatusBadge
						className="inline-flex"
						status={record.status as DocumentStatusValues}
					/>
					{canRetry && (
						<Button
							variant="ghost"
							size="icon"
							className="h-6 w-6 hover:bg-transparent"
							disabled={retryRecord.isPending}
							onClick={(e) => {
								e.preventDefault()
								e.stopPropagation()
								handleRetry(record as DisplayRecord)
							}}
							aria-label="Повторить обработку"
						>
							{retryRecord.isPending ? (
								<Loader2
									className="h-4 w-4 animate-spin"
									aria-hidden="true"
								/>
							) : (
								<RefreshCcw
									className="h-4 w-4"
									aria-hidden="true"
								/>
							)}
						</Button>
					)}
				</div>

				<div className="mb-4 flex flex-wrap items-start justify-between gap-4">
					<div className="mt-2.5 min-w-0 flex-1">
						{record.title ? (
							<h1 className="text-foreground mb-2 text-xl font-semibold">
								{record.title}
							</h1>
						) : (
							<h2 className="text-foreground mb-2 text-xl font-semibold">
								Новый документ
							</h2>
						)}
						{record.summary ? (
							<p className="text-foreground leading-relaxed">
								{typeof record.summary === "string"
									? record.summary
									: ""}
							</p>
						) : (
							<div className="mt-4 space-y-1">
								{Array.from({ length: 4 }).map((_, i) => (
									<Skeleton
										key={i}
										className={cn(
											`bg-accent-foreground h-4 rounded-lg`,
											{
												"bg-destructive animate-none":
													record.status ===
													DocumentStatus.FAILED,
											},
										)}
										style={{
											width: `${Math.floor(Math.random() * (100 - 60 + 1)) + 60}%`,
										}}
									/>
								))}
							</div>
						)}
					</div>
					{!isLocal && !isGuest && (
						<div className="flex gap-2">
							<Button
								variant="ghost"
								size="icon"
								aria-label="Редактировать запись"
							>
								<Edit2 className="h-4 w-4" aria-hidden="true" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								className="text-destructive hover:text-destructive/80"
								aria-label="Удалить запись"
							>
								<Trash2
									className="h-4 w-4"
									aria-hidden="true"
								/>
							</Button>
						</div>
					)}
				</div>

				{/* Теги */}
				{record.tags && record.tags.length > 0 ? (
					<div className="mb-4 flex flex-wrap gap-2">
						{record.tags.map((tag, index) => (
							<Badge
								key={index}
								variant="secondary"
								className="border-primary text-primary bg-primary/10 rounded-full border"
							>
								{tag.name}
							</Badge>
						))}
					</div>
				) : (
					<SkeletonTags
						status={record.status as DocumentStatusValues}
					/>
				)}

				{/* Дата */}
				<div className="text-muted-foreground flex items-center gap-2 text-sm">
					<Clock className="h-4 w-4" aria-hidden="true" />
					<span>
						{formatDate(
							new Date(record.date).getTime() ||
								new Date().getTime(),
						)}
					</span>
				</div>
			</div>

			{/* Описание (если есть большое) */}
			{record.description && record.description.length > 100 && (
				<div className="bg-background mb-6 rounded-xl border p-6 shadow-sm">
					<h2 className="text-foreground mb-4 text-lg font-semibold">
						Описание
					</h2>
					{typeof record.description === "string" && (
						<Markdown content={record.description} />
					)}
				</div>
			)}

			{/* Файлы */}
			<div className="bg-background rounded-xl border p-6 shadow-sm">
				<h2 className="text-foreground mb-4 text-lg font-semibold">
					Файлы Исследования
				</h2>
				<div className="space-y-3">
					{isLocal &&
						record.documents?.map((fileData, index) => {
							return (
								<FileCard
									key={index}
									fileName={fileData.file.name}
									fileSize={formatFileSize(
										fileData.file.size,
									)}
									status={fileData.status}
								/>
							)
						})}
					{!isLocal &&
						record.documents?.map((file, index: number) => {
							return (
								<FileCard
									key={index}
									fileName={file.fileName || ""}
									fileSize={formatFileSize(
										file.fileSize || 0,
									)}
									status={file.status}
									onDownload={() => {
										handleDownloadFile(file?.id || "")
									}}
								/>
							)
						})}
				</div>
			</div>
		</div>
	)
}
