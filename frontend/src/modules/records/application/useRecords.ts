import { useMemo } from "react"
import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query"
import type { DisplayRecord } from "../domain/types"
import type { RecordsPageData } from "./queries"
import { recordQueryOptions, recordsInfiniteQueryOptions } from "./queries"
import {
	createRecordMutation,
	retryRecordMutation,
	deleteLocalRecordMutation,
} from "../infrastructure/sync"

// =============================================================================
// GROUPED RECORDS (organized by date)
// =============================================================================

export interface GroupedRecords {
	[date: string]: DisplayRecord[]
}

/**
 * Data source override for useRecords.
 * Allows the caller to substitute the default query with an alternative
 * (e.g. shared-access guest API) without the records module knowing about it.
 */
export interface RecordsDataSource {
	queryKey: unknown[]
	queryFn: (ctx: { pageParam: number }) => Promise<RecordsPageData>
}

/**
 * Use Case: Get records organized by date groups
 *
 * @param dataSource  Optional override — when provided, the hook uses the
 *                    given queryKey/queryFn instead of the default owner API.
 */
export function useRecords(dataSource?: RecordsDataSource) {
	const defaultOptions = recordsInfiniteQueryOptions()
	const query = useInfiniteQuery(
		dataSource
			? {
					queryKey: dataSource.queryKey,
					queryFn: ({ pageParam }: { pageParam: unknown }) =>
						dataSource.queryFn({ pageParam: (pageParam as number) ?? 1 }),
					initialPageParam: defaultOptions.initialPageParam,
					getNextPageParam: defaultOptions.getNextPageParam,
				}
			: defaultOptions,
	)

	const groupedRecords = useMemo(() => {
		if (!query.data?.pages) return {}

		const allRecords: DisplayRecord[] = []

		// Flatten all pages (single pass)
		for (const page of query.data.pages) {
			allRecords.push(...page.data)
		}

		// Group by date
		const grouped: GroupedRecords = {}

		// First, separate local records (guests never have local records)
		const localRecords = allRecords.filter((r) => r.isLocal)
		const serverRecords = allRecords.filter((r) => !r.isLocal)

		// Add local records group if any
		if (localRecords.length > 0) {
			grouped["Локальные"] = localRecords
		}

		// Group server records by date
		for (const record of serverRecords) {
			let dateKey = "Без даты"

			if (record.date) {
				const date = new Date(record.date)
				if (!isNaN(date.getTime())) {
					const year = date.getFullYear()
					const month = String(date.getMonth() + 1).padStart(2, "0")
					const day = String(date.getDate()).padStart(2, "0")
					dateKey = `${year}-${month}-${day}`
				}
			}

			if (!grouped[dateKey]) {
				grouped[dateKey] = []
			}
			grouped[dateKey]!.push(record)
		}

		// Sort keys (newest first, "Без даты" last, "Локальные" first)
		const sortedKeys = Object.keys(grouped).sort((a, b) => {
			if (a === "Локальные") return -1
			if (b === "Локальные") return 1
			if (a === "Без даты") return 1
			if (b === "Без даты") return -1
			return b.localeCompare(a)
		})

		const sortedGrouped: GroupedRecords = {}
		for (const key of sortedKeys) {
			sortedGrouped[key] = grouped[key]!
		}

		return sortedGrouped
	}, [query.data?.pages])

	return {
		groupedRecords,
		isLoading: query.isLoading,
		isError: query.isError,
		error: query.error,
		fetchNextPage: query.fetchNextPage,
		hasNextPage: query.hasNextPage,
		isFetchingNextPage: query.isFetchingNextPage,
	}
}

// =============================================================================
// SINGLE RECORD
// =============================================================================

/**
 * Data source override for useRecord.
 */
export interface RecordDataSource {
	queryKey: unknown[]
	queryFn: () => Promise<unknown>
}

/**
 * Use Case: Get a single record by id.
 *
 * @param id          Record id
 * @param dataSource  Optional override for guest access
 */
export function useRecord(id: string, dataSource?: RecordDataSource) {
	return useQuery(
		dataSource
			? {
					queryKey: dataSource.queryKey,
					queryFn: dataSource.queryFn,
					enabled: !!id,
				}
			: recordQueryOptions(id),
	)
}

// =============================================================================
// CREATE RECORD
// =============================================================================

/**
 * Use Case: Create a new record with files
 */
export function useCreateRecord() {
	const queryClient = useQueryClient()
	return useMutation(createRecordMutation(queryClient))
}

// =============================================================================
// RETRY RECORD
// =============================================================================

/**
 * Use Case: Retry failed record processing
 */
export function useRetryRecord() {
	const queryClient = useQueryClient()
	return useMutation(retryRecordMutation(queryClient))
}

// =============================================================================
// DELETE LOCAL RECORD
// =============================================================================

/**
 * Use Case: Delete a local (unsynced) record
 */
export function useDeleteLocalRecord() {
	const queryClient = useQueryClient()
	return useMutation(deleteLocalRecordMutation(queryClient))
}
