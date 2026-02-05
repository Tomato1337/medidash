import { Input } from "@/shared/ui/input"
import { Button } from "@/shared/ui/button"
import FilterIcon from "@/shared/ui/icons/filter"
import SortIcon from "@/shared/ui/icons/sort"
import SearchIcon from "@/shared/ui/icons/search"
import { MedicalRecordCard } from "@/pages/dashboard/ui/medical-record-card"
import { useEffect, useRef, useState } from "react"
import { CircleQuestionMark, FrownIcon } from "lucide-react"
import CreateDocumentDialog from "./create-document-dialog"
import {
	useRecordsWithGroups,
	useRetryRecord,
	type DisplayRecord,
} from "@/entities/record"
import { useIntersection } from "@/shared/hooks/useInteresction"
import { Skeleton } from "@/shared/ui/skeleton"

export default function DashboardPage() {
	const ref = useRef<HTMLInputElement>(null)
	const [isWasData, setIsWasData] = useState(true)
	const {
		groupedRecords,
		isLoading,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
	} = useRecordsWithGroups()

	const infRef = useRef<HTMLDivElement>(null)
	const isIntersection = useIntersection(infRef, { threshold: 1.0 })

	const retryRecord = useRetryRecord()

	const handleRetry = (record: DisplayRecord) => {
		if (!record.errorPhase) return

		retryRecord.mutate({
			recordId: record.id,
			phase: record.errorPhase,
		})
	}

	useEffect(() => {
		if (isIntersection && hasNextPage && !isFetchingNextPage) {
			fetchNextPage()
		}
	}, [isIntersection, hasNextPage, isFetchingNextPage, fetchNextPage])

	useEffect(() => {
		if (
			groupedRecords &&
			Object.keys(groupedRecords).length <= 0 &&
			!isLoading
		) {
			setIsWasData(false)
		}
	}, [groupedRecords, isLoading])

	return (
		<>
			<div className="space-y-6">
				<div className="flex flex-wrap items-center gap-3">
					<div className="relative h-12 min-w-[260px] flex-1">
						<SearchIcon
							className="text-primary absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 pointer-events-none"
							aria-hidden="true"
						/>
						<span
							className="bg-primary-foreground absolute top-1/2 left-10 h-4 w-[1px] -translate-y-1/2 rounded pointer-events-none"
							aria-hidden="true"
						></span>
						<Input
							ref={ref}
							type="text"
							placeholder="Поиск..."
							aria-label="Поиск"
							className="bg-secondary-foreground text-primary-foreground placeholder:text-primary-foreground/60 selection:bg-primary selection:text-primary-foreground h-full w-full rounded-lg border-2 border-transparent pr-4 pl-12"
						/>
					</div>
					<div className="flex items-center gap-2">
						<Button
							variant="ghost"
							size="icon"
							className="bg-secondary-foreground hover:bg-primary/10 h-11 w-11 rounded-lg border border-transparent"
							aria-label="Сортировка"
						>
							<SortIcon className="h-5 w-5" aria-hidden="true" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="bg-secondary-foreground hover:bg-primary/10 h-11 w-11 rounded-lg border border-transparent"
							aria-label="Фильтр"
						>
							<FilterIcon className="h-5 w-5" aria-hidden="true" />
						</Button>
					</div>
				</div>

				<div className="bg-secondary-foreground flex min-h-[75vh] flex-col justify-start space-y-4 rounded-xl p-6 shadow-sm">
					{!isWasData ? (
						<div className="">
							<FrownIcon className="text-primary-foreground mx-auto size-32" aria-hidden="true" />
							<h2 className="text-primary-foreground mt-4 text-center text-2xl font-semibold">
								У вас пока нет медицинских записей
							</h2>
							<p className="text-primary-foreground/70 mt-2 text-center">
								Нажмите на кнопку ниже, чтобы добавить новую
								запись
							</p>
						</div>
					) : groupedRecords &&
					  Object.keys(groupedRecords).length > 0 &&
					  !isLoading ? (
						Object.entries(groupedRecords).map(
							([date, records]) => (
								<div key={date} className="w-full">
									<h2 className="text-primary-foreground mb-4 text-2xl font-semibold">
										{date !== "Локальные" &&
										date !== "Без даты"
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
												key={record.id}
												id={record.id}
												title={record.title}
												summary={
													typeof record.summary ===
													"string"
														? record.summary
														: undefined
												}
												tags={record.tags}
												filesCount={
													record.documentCount
												}
												date={
													record.date instanceof Date
														? record.date.toISOString()
														: (record.date ??
															undefined)
												}
												status={record.status}
												failedPhase={record.errorPhase}
												onRetry={() =>
													handleRetry(record)
												}
												isRetrying={
													retryRecord.isPending &&
													retryRecord.variables
														?.recordId === record.id
												}
											/>
										))}
									</div>
								</div>
							),
						)
					) : !isLoading ? (
						<div className="">
							<CircleQuestionMark className="text-primary-foreground mx-auto size-32" aria-hidden="true" />
							<h2 className="text-primary-foreground mt-4 text-center text-2xl font-semibold">
								Нет результатов по вашему запросу
							</h2>
						</div>
					) : null}

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
