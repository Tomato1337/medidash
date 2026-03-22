import { queryOptions, infiniteQueryOptions } from "@tanstack/react-query"
import { type DTO } from "@/shared/api/api"
import { db } from "@/shared/lib/indexedDB"
import { queryKeys } from "@/shared/api/queries"
import { getRecord, getRecords } from "../infrastructure/recordsApi"
import type {
	DisplayRecord,
	LocalRecord,
	RecordsFilters,
	UnifiedRecord,
} from "../domain/types"
import { hasActiveFilters, normalizeRecord } from "../domain/guards"
import { toDisplayRecord } from "../domain/mappers"

// =============================================================================
// TYPES
// =============================================================================

export interface RecordsPageData {
	data: DisplayRecord[]
	page: number
	limit: number
	total: number
	localCount: number
}

// =============================================================================
// SINGLE RECORD QUERY
// =============================================================================

export const recordQueryOptions = (id: string) =>
	queryOptions({
		queryKey: queryKeys.records.detail(id),
		queryFn: async (): Promise<UnifiedRecord> => {
			const data = await getRecord(id)
			// SW может вернуть IDBRecord — нормализуем
			return normalizeRecord(data)
		},
	})

// =============================================================================
// RECORDS LIST WITH LOCAL MERGE
// =============================================================================

export const recordsInfiniteQueryOptions = (filters?: RecordsFilters) =>
	infiniteQueryOptions({
		queryKey: queryKeys.records.infinite(filters),
		queryFn: async ({ pageParam = 1 }): Promise<RecordsPageData> => {
			const data = await getRecords({
				page: pageParam,
				limit: 10,
				...filters,
			})
			const shouldSkipLocalMerge = filters
				? hasActiveFilters(filters)
				: false

			// На первой странице добавляем локальные записи
			if (pageParam === 1 && !shouldSkipLocalMerge) {
				const localRecords = await db.records.toArray()

				// Исключаем локальные записи, которые уже есть на сервере
				const serverIds = new Set(data.data.map((r) => r.id))
				const uniqueLocalRecords = localRecords.filter(
					(lr) => !serverIds.has(lr.id),
				)

				// Преобразуем в DisplayRecord
				const localDisplayRecords = uniqueLocalRecords.map((lr) =>
					toDisplayRecord(lr as LocalRecord),
				)

				// Серверные записи
				const serverDisplayRecords = data.data.map((sr) =>
					toDisplayRecord(sr as DTO["RecordResponseDto"]),
				)

				// Локальные записи идут первыми
				return {
					data: [...localDisplayRecords, ...serverDisplayRecords],
					page: data.page,
					limit: data.limit,
					total: data.total + uniqueLocalRecords.length,
					localCount: uniqueLocalRecords.length,
				}
			}

			// Для остальных страниц — только серверные
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
		initialPageParam: 1,
		getNextPageParam: (lastPage) => {
			if (!lastPage || lastPage.page * lastPage.limit >= lastPage.total) {
				return undefined
			}
			return lastPage.page + 1
		},
	})
