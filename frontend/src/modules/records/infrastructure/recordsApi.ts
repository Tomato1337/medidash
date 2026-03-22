import { client, type DTO } from "@/shared/api/api"
import type { RecordsFilters } from "../domain/types"

// =============================================================================
// RECORDS API - Pure functions for API calls
// =============================================================================

export interface RecordsListParams extends Partial<RecordsFilters> {
	page?: number
	limit?: number
}

export interface RecordsListResponse {
	data: DTO["RecordResponseDto"][]
	page: number
	limit: number
	total: number
}

/**
 * Fetch a single record by ID
 */
export async function getRecord(id: string) {
	const { data, error } = await client.GET("/api/records/{id}", {
		params: { path: { id } },
	})

	if (error) throw error
	return data
}

/**
 * Fetch paginated list of records
 */
export async function getRecords(
	params: RecordsListParams = {},
): Promise<RecordsListResponse> {
	const {
		page = 1,
		limit = 10,
		search,
		sortBy,
		sortDir,
		dateFrom,
		dateTo,
		tags,
		status,
	} = params

	const query: Record<string, string | number> = {
		page,
		limit,
	}

	if (search?.trim()) {
		query.search = search.trim()
	}

	if (sortBy && sortBy !== "date") {
		query.sortBy = sortBy
	}

	if (sortDir && sortDir !== "desc") {
		query.sortDir = sortDir
	}

	if (dateFrom) {
		query.dateFrom = dateFrom
	}

	if (dateTo) {
		query.dateTo = dateTo
	}

	if (tags && tags.length > 0) {
		query.tags = tags.join(",")
	}

	if (status && status.length > 0) {
		query.status = status.join(",")
	}

	const { data, error } = await client.GET("/api/records", {
		params: { query },
	})

	if (error) throw error
	if (!data) throw new Error("No data returned")

	return data
}
