import { useRecord } from "@/entities/document"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { FileCard } from "@/entities/document/ui/file-card"
import {
	Loader2,
	ArrowLeft,
	Edit2,
	Trash2,
	Clock,
	RefreshCcw,
} from "lucide-react"
import { useNavigate } from "@tanstack/react-router"
import { isLocalRecord } from "@/entities/document/api/useRecord"
import { Skeleton } from "@/shared/ui/skeleton"
import { StatusBadgeFactory } from "@/entities/document/ui/status"
import { SkeletonTags } from "@/shared/ui/skeletonTags"
import {
	useCompressLocalRecord,
	useUploadFile,
	useUploadRecord,
} from "@/entities/document/api/useLocalRecords"
import { DocumentStatus, type DocumentStatusValues } from "@shared-types"
import { formatDate } from "@/shared/lib/utils"

interface RecordPageProps {
	id?: string
}

export default function RecordPage({ id }: RecordPageProps) {
	const navigate = useNavigate()
	const { data: record, isLoading, isError } = useRecord(id || "")
	const compress = useCompressLocalRecord()
	const upload = useUploadRecord()

	const handleRetry = (record: any) => {
		console.log(record)
		if (!record.isLocal) return

		if (record.error?.type === DocumentStatus.COMPRESSING) {
			compress.mutate(record.id)
		} else if (record.error?.type === DocumentStatus.UPLOADING) {
			upload.mutate(record.id)
		}
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
				<Button onClick={() => navigate({ to: "/dashboard" })}>
					Вернуться на главную
				</Button>
			</div>
		)
	}
	const isLocal = isLocalRecord(record)

	const formatFileSize = (bytes: number) => {
		if (bytes < 1024) return `${bytes} B`
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
	}

	return (
		<div className="container mx-auto max-w-4xl py-6">
			{/* Хедер */}
			<div className="mb-6 flex items-center justify-between">
				<Button
					variant="ghost"
					onClick={() => navigate({ to: "/dashboard" })}
					className="gap-2"
				>
					<ArrowLeft className="h-4 w-4" />
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
			<div className="bg-background mb-6 space-y-2 rounded-xl border p-6 shadow-sm">
				<div className="flex gap-2">
					<StatusBadgeFactory
						className="inline-flex"
						status={record.status as DocumentStatusValues}
					/>
					{record.status === DocumentStatus.FAILED && (
						<Button
							variant="ghost"
							size="icon"
							className="h-6 w-6 hover:bg-transparent"
							onClick={(e) => {
								e.preventDefault()
								e.stopPropagation()
								handleRetry(record)
							}}
						>
							<RefreshCcw className="h-4 w-4" />
						</Button>
					)}
				</div>

				<div className="mb-4 flex items-start justify-between">
					<div className="mt-2.5 flex-1">
						{record.title ? (
							<h1 className="text-foreground mb-2 text-xl font-semibold">
								{record.title}
							</h1>
						) : (
							// <Skeleton className="bg-accent-foreground h-4 w-full rounded-lg" />
							<h2 className="text-foreground mb-2 text-xl font-semibold">
								Новый документ
							</h2>
						)}
						{record.description ? (
							<p className="text-muted-foreground">
								{typeof record.description === "string"
									? record.description
									: ""}
							</p>
						) : (
							<div className="mt-4 space-y-1">
								{Array.from({ length: 4 }).map((_, id) => (
									<Skeleton
										key={id}
										className={`bg-accent-foreground h-4 rounded-lg`}
										style={{
											width: `${Math.floor(Math.random() * (100 - 60 + 1)) + 60}%`,
										}}
									/>
								))}
							</div>
						)}
					</div>
					{!isLocal && (
						<div className="flex gap-2">
							<Button variant="ghost" size="icon">
								<Edit2 className="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								className="text-destructive hover:text-destructive/80"
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>
					)}
				</div>

				{/* Статус */}
				{/* {isLocal && (
					<div className="mb-4">
						<div className="flex items-center gap-2">
							{record.status === "pending" && (
								<Badge variant="outline">
									Ожидает обработки
								</Badge>
							)}
							{record.status === "compressing" && (
								<>
									<Loader2 className="text-primary h-4 w-4 animate-spin" />
									<Badge
										variant="outline"
										className="border-blue-500 bg-blue-500/10 text-blue-700"
									>
										Сжатие файлов
									</Badge>
								</>
							)}
							{record.status === "uploading" && (
								<>
									<Loader2 className="text-primary h-4 w-4 animate-spin" />
									<Badge
										variant="outline"
										className="border-green-500 bg-green-500/10 text-green-700"
									>
										Загрузка на сервер
									</Badge>
								</>
							)}
							{record.status === "error" && (
								<Badge
									variant="outline"
									className="border-destructive bg-destructive/10 text-destructive"
								>
									Ошибка: {record.error?.message}
								</Badge>
							)}
						</div>
					</div>
				)} */}

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
					<SkeletonTags />
				)}

				{/* Дата */}
				<div className="text-muted-foreground flex items-center gap-2 text-sm">
					<Clock className="h-4 w-4" />
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
					<p className="text-muted-foreground leading-relaxed">
						{typeof record.description === "string"
							? record.description
							: ""}
					</p>
				</div>
			)}

			{/* Файлы */}
			<div className="bg-background rounded-xl border p-6 shadow-sm">
				<h2 className="text-foreground mb-4 text-lg font-semibold">
					Файлы Исследования
				</h2>
				<div className="space-y-3">
					{isLocal &&
						record.documents?.map((fileData, index) => (
							<FileCard
								key={index}
								fileName={fileData.file.name}
								fileSize={formatFileSize(fileData.file.size)}
								status={fileData.status}
							/>
						))}
					{!isLocal &&
						record.documents?.map((file, index: number) => (
							<FileCard
								key={index}
								fileName={file.fileName || ""}
								fileSize={formatFileSize(file.fileSize || 0)}
								status={file.status}
								onDownload={() =>
									console.log("Download", file.fileName)
								}
							/>
						))}
				</div>
			</div>
		</div>
	)
}
