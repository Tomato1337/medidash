import { getSharedAccessClient } from "./sharedAccessApiClient"
import type { DTO } from "@/shared/api/api"

export interface RecordsListResponse {
	data: DTO["RecordResponseDto"][]
	page: number
	limit: number
	total: number
}

export async function getSharedRecords(
	token: string,
	params: { page?: number; limit?: number } = {},
) {
	const { page = 1, limit = 10 } = params
	const client = getSharedAccessClient(token)
	// Прокси-эндпоинт — ответ приходит из document-service, тип в схеме отсутствует
	const { data, error } = await client.GET(
		"/api/shared-access/{token}/records",
		{
			params: { path: { token }, query: { page, limit } },
		},
	)
	if (error) throw error
	if (!data) throw new Error("No data returned")
	return data as unknown as RecordsListResponse
}

export async function getSharedRecord(token: string, id: string) {
	const client = getSharedAccessClient(token)
	// Прокси-эндпоинт — ответ приходит из document-service, тип в схеме отсутствует
	const { data, error } = await client.GET(
		"/api/shared-access/{token}/records/{recordId}",
		{
			params: { path: { token, recordId: id } },
		},
	)
	if (error) throw error
	if (!data) throw new Error("No data returned")
	return data as unknown as DTO["RecordResponseDto"]
}
