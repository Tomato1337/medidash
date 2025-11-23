import { Input } from "@/shared/ui/input"
import { Button } from "@/shared/ui/button"
import FilterIcon from "@/shared/ui/icons/filter"
import SortIcon from "@/shared/ui/icons/sort"
import SearchIcon from "@/shared/ui/icons/search"
import { MedicalRecordCard } from "@/pages/dashboard/ui/medical-record-card"
import { useEffect, useRef, useState } from "react"
import { CircleQuestionMark, FrownIcon } from "lucide-react"
import CreateDocumentDialog from "./create-document-dialog"
import { useRecords } from "@/entities/document/api/useRecord"
import {
	useCompressLocalRecord,
	useUploadRecord,
} from "@/entities/document/api/useLocalRecords"
import { DocumentStatus, type DocumentStatusValues } from "@shared-types"
import { useIntersection } from "@/shared/hooks/useInteresction"
import { Skeleton } from "@/shared/ui/skeleton"

export default function DashboardPage() {
	const ref = useRef<HTMLInputElement>(null)
	const [isWasData, setIsWasData] = useState(false)
	const {
		groupedRecords,
		isLoading,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
	} = useRecords()
	const infRef = useRef<HTMLDivElement>(null)
	const isIntersection = useIntersection(infRef, { threshold: 1.0 })

	const compress = useCompressLocalRecord()
	const upload = useUploadRecord()

	const handleRetry = (record: any) => {
		if (!record.isLocal) return

		if (record.error?.type === DocumentStatus.COMPRESSING) {
			compress.mutate(record.id)
		} else if (record.error?.type === DocumentStatus.UPLOADING) {
			upload.mutate(record.id)
		}
	}

	useEffect(() => {
		if (isIntersection && hasNextPage && !isFetchingNextPage) {
			fetchNextPage()
		}
	}, [isIntersection, hasNextPage, isFetchingNextPage, fetchNextPage])

	useEffect(() => {
		if (groupedRecords && Object.keys(groupedRecords).length > 0) {
			setIsWasData(true)
		}
	}, [groupedRecords])

	return (
		<>
			<div className="">
				<div className="flex h-10 w-full items-center gap-3">
					<div className="relative h-10 flex-1">
						<SearchIcon
							onClick={() => {
								ref.current?.focus()
							}}
							className="text-primary absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 cursor-text"
						/>
						<span
							onClick={() => {
								ref.current?.focus()
							}}
							className="bg-primary-foreground absolute top-1/2 left-10 h-4 w-[1px] -translate-y-1/2 cursor-text rounded"
						></span>
						<Input
							ref={ref}
							type="text"
							placeholder="Поиск..."
							className="bg-primary text-primary-foreground placeholder:text-primary-foreground/70 selection:bg-primary-foreground selection:text-primary h-full w-full rounded-lg border-none pr-4 pl-12"
						/>
					</div>
					<Button
						variant="ghost"
						size="icon"
						className="bg-secondary-foreground hover:bg-primary/90 h-10 w-10 rounded-lg"
					>
						<SortIcon className="h-5 w-5" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="bg-secondary-foreground hover:bg-primary/90 h-10 w-10 rounded-lg"
					>
						<FilterIcon className="h-5 w-5" />
					</Button>
				</div>

				<div className="bg-secondary-foreground mt-6 flex min-h-[75vh] flex-col justify-start space-y-4 rounded-xl p-6">
					{!isWasData ? (
						<div className="">
							<FrownIcon className="text-primary-foreground mx-auto size-32" />
							<h2 className="text-primary-foreground mt-4 text-center text-2xl font-semibold">
								У вас пока нет медицинских записей
							</h2>
							<p className="text-primary-foreground/70 mt-2 text-center">
								Нажмите на кнопку ниже, чтобы добавить новую
								запись
							</p>
						</div>
					) : groupedRecords &&
					  Object.keys(groupedRecords).length > 0 ? (
						Object.entries(groupedRecords).map(
							([date, records]) => (
								<div key={date} className="w-full">
									<h2 className="text-primary-foreground mb-4 text-2xl font-semibold">
										{date !== "Локальные"
											? new Date(date).toLocaleDateString(
													"ru-RU",
													{
														day: "numeric",
														month: "long",
														year: "numeric",
													},
												)
											: date}
									</h2>
									<hr className="border-primary-foreground rounded" />
									<div className="mt-4 flex flex-col gap-1">
										{records.map((record) => (
											<MedicalRecordCard
												key={record?.id}
												id={record?.id}
												title={record?.title}
												summary={
													typeof record?.summary ===
													"string"
														? record.summary
														: undefined
												}
												tags={record?.tags}
												filesCount={
													record?.documentCount
												}
												date={
													typeof record?.date ===
													"number"
														? new Date(
																record.date,
															).toISOString()
														: record?.date
												}
												status={
													record?.status as DocumentStatusValues
												}
												onRetry={() =>
													handleRetry(record)
												}
											/>
										))}
									</div>
								</div>
							),
						)
					) : (
						<div className="">
							<CircleQuestionMark className="text-primary-foreground mx-auto size-32" />
							<h2 className="text-primary-foreground mt-4 text-center text-2xl font-semibold">
								Нет результатов по вашему запросу
							</h2>
						</div>
					)}
					<div className="h-1 w-full" ref={infRef}></div>
					{(isFetchingNextPage || isLoading) && (
						<div className="flex w-full flex-col gap-2">
							{Array.from({ length: 3 }).map((_, id) => (
								<Skeleton
									key={id}
									className="h-48 w-full rounded-lg"
								/>
							))}
						</div>
					)}
				</div>
			</div>

			<CreateDocumentDialog />
		</>
	)
}
