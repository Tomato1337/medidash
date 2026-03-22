import type { UnifiedRecord, LocalRecord, RecordsFilters } from "./types"
import { localRecordSchema } from "./schemas"

// =============================================================================
// TYPE GUARDS
// =============================================================================

export function isLocalRecord(data: UnifiedRecord): data is LocalRecord {
	return "isLocal" in data && data.isLocal === true
}

// =============================================================================
// NORMALIZER
// =============================================================================

export function normalizeRecord(data: unknown): UnifiedRecord {
	console.log("normalizeRecord", data)
	const parseResult = localRecordSchema.safeParse(data)
	if (parseResult.success) {
		return parseResult.data
	}
	return data as Exclude<UnifiedRecord, LocalRecord>
}

/** Проверяет, есть ли активные фильтры (кроме дефолтной сортировки) */
export function hasActiveFilters(filters: RecordsFilters): boolean {
	return !!(
		filters.search ||
		filters.dateFrom ||
		filters.dateTo ||
		(filters.tags && filters.tags.length > 0) ||
		(filters.status && filters.status.length > 0)
	)
}

/** Количество активных фильтров (для badge) */
export function countActiveFilters(filters: RecordsFilters): number {
	let count = 0
	if (filters.dateFrom || filters.dateTo) count++ // диапазон дат — один фильтр
	if (filters.tags && filters.tags.length > 0) count++
	if (filters.status && filters.status.length > 0) count++
	if (filters.search) count++
	return count
}
