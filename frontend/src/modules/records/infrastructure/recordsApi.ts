import { client, type DTO } from "@/shared/api/api"

// =============================================================================
// RECORDS API - Pure functions for API calls
// =============================================================================

export interface RecordsListParams {
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
	const { page = 1, limit = 10 } = params

	const { data, error } = await client.GET("/api/records", {
		params: { query: { page, limit } },
	})

	if (error) throw error
	if (!data) throw new Error("No data returned")

	return data
}
