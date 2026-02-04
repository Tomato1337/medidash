import { useMemo } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import { recordsInfiniteQueryOptions } from "./record.api"
import type { DisplayRecord } from "../record.model"

// =============================================================================
// GROUPED RECORDS HOOK
// =============================================================================

export interface GroupedRecords {
	[date: string]: DisplayRecord[]
}

export function useRecordsWithGroups() {
	const query = useInfiniteQuery(recordsInfiniteQueryOptions())

	const groupedRecords = useMemo(() => {
		if (!query.data?.pages) return {}

		const allRecords: DisplayRecord[] = []

		// Flatten all pages
		for (const page of query.data.pages) {
			allRecords.push(...page.data)
		}

		// Group by date
		const grouped: GroupedRecords = {}

		// First, separate local records
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
