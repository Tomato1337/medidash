import { queryOptions, infiniteQueryOptions } from "@tanstack/react-query"
import { client, type DTO } from "@/shared/api/api"
import { db } from "@/shared/lib/indexedDB"
import {
	normalizeRecord,
	getRecordDisplayData,
	type UnifiedRecord,
	type LocalRecord,
	type DisplayRecord,
} from "../record.model"

// =============================================================================
// SINGLE RECORD
// =============================================================================

export const recordQueryOptions = (id: string) =>
	queryOptions({
		queryKey: ["record", id],
		queryFn: async (): Promise<UnifiedRecord> => {
			const { data, error } = await client.GET("/api/records/{id}", {
				params: { path: { id } },
			})

			if (error) throw error

			// SW может вернуть IDBRecord — нормализуем
			return normalizeRecord(data)
		},
	})

// =============================================================================
// RECORDS LIST WITH LOCAL MERGE
// =============================================================================

export interface RecordsPageData {
	data: DisplayRecord[]
	page: number
	limit: number
	total: number
	localCount: number
}

export const recordsInfiniteQueryOptions = () =>
	infiniteQueryOptions({
		queryKey: ["records"],
		queryFn: async ({ pageParam = 1 }): Promise<RecordsPageData> => {
			const { data, error } = await client.GET("/api/records", {
				params: { query: { page: pageParam, limit: 10 } },
			})

			if (error) throw error
			if (!data) throw new Error("No data returned")

			// На первой странице добавляем локальные записи
			if (pageParam === 1) {
				const localRecords = await db.records.toArray()

				// Исключаем локальные записи, которые уже есть на сервере
				const serverIds = new Set(data.data.map((r) => r.id))
				const uniqueLocalRecords = localRecords.filter(
					(lr) => !serverIds.has(lr.id),
				)

				// Преобразуем в DisplayRecord
				const localDisplayRecords = uniqueLocalRecords.map((lr) =>
					getRecordDisplayData(lr as LocalRecord),
				)

				// Серверные записи
				const serverDisplayRecords = data.data.map((sr) =>
					getRecordDisplayData(sr as DTO["RecordResponseDto"]),
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
				getRecordDisplayData(sr as DTO["RecordResponseDto"]),
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

// =============================================================================
// HOOKS (re-export for convenience)
// =============================================================================

export { useQuery, useInfiniteQuery } from "@tanstack/react-query"
