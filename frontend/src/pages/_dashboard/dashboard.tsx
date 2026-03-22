import { Input } from "@/shared/ui/input"
import { Button } from "@/shared/ui/button"
import SearchIcon from "@/shared/ui/icons/search"
import { MedicalRecordCard } from "@/pages/_dashboard/ui/medical-record-card"
import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { CircleQuestionMark, FrownIcon } from "lucide-react"
import CreateDocumentDialog from "./ui/create-document-dialog"
import { useViewMode } from "@/modules/shared-access"
import {
	useRecords,
	useRetryRecord,
	type RecordsFilters,
	DEFAULT_FILTERS,
	hasActiveFilters,
	countActiveFilters,
	type DisplayRecord,
	type RecordsDataSource,
} from "@/modules/records"
import { getSharedRecords } from "@/modules/shared-access/infrastructure/sharedRecordsApi"
import { toDisplayRecord } from "@/modules/records"
import type { DTO } from "@/shared/api/api"
import { useIntersection } from "@/shared/hooks/useInteresction"
import { Skeleton } from "@/shared/ui/skeleton"
import { SidebarTrigger } from "@/shared/ui/sidebar"
import { cn } from "@/shared/lib/utils"
import { useNavigate, useSearch } from "@tanstack/react-router"
import { RecordsSortPopover } from "./ui/records-sort-popover"
import { RecordsFilterPopover } from "./ui/records-filter-popover"
import { FilterChip } from "./ui/filter-chip"
import { NotFound } from '@/shared/ui/not-found'

export default function DashboardPage() {
	const viewMode = useViewMode()
	const isGuest = viewMode.type === "guest"
	const navigate = useNavigate()
	const searchParams = useSearch({ strict: false })
	const routeFilters = searchParams as Partial<RecordsFilters>
	const filters: RecordsFilters = {
		sortBy: routeFilters.sortBy ?? DEFAULT_FILTERS.sortBy,
		sortDir: routeFilters.sortDir ?? DEFAULT_FILTERS.sortDir,
		dateFrom: routeFilters.dateFrom,
		dateTo: routeFilters.dateTo,
		tags: routeFilters.tags,
		status: routeFilters.status,
		search: routeFilters.search,
	}
	const filtersActive = hasActiveFilters(filters)
	const filterCount = countActiveFilters(filters)

	const ref = useRef<HTMLInputElement>(null)
	const [isWasData, setIsWasData] = useState(true)
	const [searchInput, setSearchInput] = useState(filters.search ?? "")
	const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const updateFilters = useCallback(
		(patch: Partial<RecordsFilters>) => {
			navigate({
				search: (prev: Record<string, unknown>) => {
					const next = { ...prev, ...patch }

					// Убираем undefined/пустые значения из URL
					for (const [key, value] of Object.entries(next)) {
						if (
							value === undefined ||
							value === "" ||
							(Array.isArray(value) && value.length === 0)
						) {
							delete next[key]
						}
					}

					// Убираем дефолтные значения
					if (next.sortBy === DEFAULT_FILTERS.sortBy) delete next.sortBy
					if (next.sortDir === DEFAULT_FILTERS.sortDir) delete next.sortDir

					return next
				},
				replace: true,
			})
		},
		[navigate],
	)

	const handleSearchChange = useCallback(
		(value: string) => {
			setSearchInput(value)
			if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

			searchTimeoutRef.current = setTimeout(() => {
				updateFilters({ search: value || undefined })
			}, 400)
		},
		[updateFilters],
	)

	const clearAllFilters = useCallback(() => {
		setSearchInput("")
		navigate({ search: {}, replace: true })
	}, [navigate])

	// Build guest data source only when in guest mode (stable reference via useMemo)
	const guestDataSource: RecordsDataSource | undefined = useMemo(() => {
		if (viewMode.type !== "guest") return undefined
		const token = viewMode.token
		return {
			queryKey: ["records", "infinite", "shared", token],
			queryFn: async ({ pageParam }: { pageParam: number }) => {
				const data = await getSharedRecords(token, { page: pageParam, limit: 10 })
				const serverDisplayRecords = data.data.map((sr) =>
					toDisplayRecord(sr as DTO["RecordResponseDto"]),
				)
				return {
					data: serverDisplayRecords,
					page: data.page,
					limit: data.limit,
					total: data.total,
					localCount: 0,
				}
			},
		}
	// viewMode.type and viewMode.token are stable for the lifetime of this provider
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isGuest, isGuest && viewMode.type === "guest" ? viewMode.token : ""])

	const {
		groupedRecords,
		isLoading,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
	} = useRecords(guestDataSource, filters)

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
		setSearchInput(filters.search ?? "")
	}, [filters.search])

	useEffect(() => {
		return () => {
			if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
		}
	}, [])

	useEffect(() => {
		if (
			groupedRecords &&
			Object.keys(groupedRecords).length <= 0 &&
			!isLoading &&
			!filtersActive
		) {
			setIsWasData(false)
		}
	}, [groupedRecords, isLoading, filtersActive])

	return (
		<>
			<div className="@container space-y-6">
				<div className="bg-accent sticky top-0 z-10 flex items-center gap-3 border-b py-2.5">
					<SidebarTrigger />

					<div className="relative h-12 min-w-[260px] flex-1">
						<SearchIcon
							className="text-primary pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2"
							aria-hidden="true"
						/>
						<span
							className="bg-primary-foreground pointer-events-none absolute top-1/2 left-10 h-4 w-[1px] -translate-y-1/2 rounded"
							aria-hidden="true"
						></span>
						<Input
							ref={ref}
							type="text"
							placeholder="Поиск..."
							aria-label="Поиск"
							value={searchInput}
							onChange={(event) => {
								handleSearchChange(event.target.value)
							}}
							className="bg-secondary-foreground text-primary-foreground placeholder:text-primary-foreground/60 selection:bg-primary selection:text-primary-foreground h-full w-full rounded-lg border-2 border-transparent pr-4 pl-12"
						/>
						{searchInput && (
							<Button
								type="button"
								variant="ghost"
								size="icon"
								onClick={() => {
									setSearchInput("")
									if (searchTimeoutRef.current) {
										clearTimeout(searchTimeoutRef.current)
									}
									updateFilters({ search: undefined })
								}}
								className="text-primary-foreground/70 hover:text-primary-foreground absolute top-1/2 right-2 h-8 w-8 -translate-y-1/2"
								aria-label="Очистить поиск"
							>
								✕
							</Button>
						)}
					</div>
					<div className="flex flex-shrink-0 items-center gap-2">
						<RecordsSortPopover
							sortBy={filters.sortBy}
							sortDir={filters.sortDir}
							onChange={(sortBy, sortDir) => {
								updateFilters({ sortBy, sortDir })
							}}
						/>
						<RecordsFilterPopover
							filters={filters}
							onChange={updateFilters}
							activeCount={filterCount}
						/>
					</div>
				</div>

				{filtersActive && (
					<div className="flex flex-wrap items-center gap-2 px-1">
						{filters.search && (
							<FilterChip
								label={`Поиск: ${filters.search}`}
								onRemove={() => {
									setSearchInput("")
									updateFilters({ search: undefined })
								}}
							/>
						)}
						{filters.dateFrom && (
							<FilterChip
								label={`с ${filters.dateFrom}`}
								onRemove={() => {
									updateFilters({ dateFrom: undefined })
								}}
							/>
						)}
						{filters.dateTo && (
							<FilterChip
								label={`до ${filters.dateTo}`}
								onRemove={() => {
									updateFilters({ dateTo: undefined })
								}}
							/>
						)}
						<button
							type="button"
							onClick={clearAllFilters}
							className="text-muted-foreground hover:text-foreground text-sm"
						>
							Сбросить все
						</button>
					</div>
				)}

				<div
					className={cn(
						"bg-secondary-foreground flex min-h-[calc(100vh-135px)] flex-col justify-start space-y-4 overflow-auto rounded-xl p-6 shadow-sm",
						!isWasData && "justify-center",
                        Object.keys(groupedRecords).length === 0 && !isLoading && "justify-center",
					)}
				>
					{!isWasData ? (
						<div className="">
							<FrownIcon
								className="text-primary-foreground mx-auto size-32"
								aria-hidden="true"
							/>
							<h2 className="text-primary-foreground mt-4 text-center text-2xl font-semibold">
								{isGuest
									? "У владельца пока нет медицинских записей"
									: "У вас пока нет медицинских записей"}
							</h2>
							{!isGuest && (
								<p className="text-primary-foreground/70 mt-2 text-center">
									Нажмите на кнопку ниже, чтобы добавить новую
									запись
								</p>
							)}
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
									<div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(18rem,1fr))] gap-3">
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
												failedPhase={
													record.errorPhase ||
													record.failedPhase
												}
												onRetry={
													!isGuest
														? () => handleRetry(record)
														: undefined
												}
												isRetrying={
													!isGuest &&
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
					) : !isLoading && filtersActive ? (
						<NotFound />
					) : !isLoading ? (
						<NotFound/>
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

			{!isGuest && <CreateDocumentDialog />}
		</>
	)
}
