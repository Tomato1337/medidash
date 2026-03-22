import { client } from "@/shared/api/api"
import type { DTO } from "@/shared/api/api"

// Типы, выведенные из сгенерированной OpenAPI-схемы
type SharedAccessResponse = DTO["SharedAccessResponseDto"]
type CreateSharedAccessResponse = DTO["CreateSharedAccessResponseDto"]
type SharedAccessSession = DTO["SharedAccessSessionResponseDto"]
type SharedAccessInfo = DTO["SharedAccessInfoResponseDto"]

export type { SharedAccessResponse, CreateSharedAccessResponse, SharedAccessSession, SharedAccessInfo }

export async function createSharedAccess(
	body: DTO["CreateSharedAccessDto"],
) {
	const { data, error } = await client.POST("/api/shared-access", {
		body,
	})
	if (error) throw error
	if (!data) throw new Error("No data returned")
	return data
}

export async function listSharedAccesses() {
	const { data, error } = await client.GET("/api/shared-access")
	if (error) throw error
	return data ?? []
}

export async function revokeSharedAccess(id: string) {
	const { data, error } = await client.DELETE("/api/shared-access/{id}", {
		params: { path: { id } },
	})
	if (error) throw error
	return data
}

export async function listSharedAccessSessions(accessId: string) {
	const { data, error } = await client.GET(
		"/api/shared-access/{id}/sessions",
		{
			params: { path: { id: accessId } },
		},
	)
	if (error) throw error
	return data ?? []
}

export async function revokeSharedAccessSession(
	accessId: string,
	sessionId: string,
) {
	const { data, error } = await client.DELETE(
		"/api/shared-access/{id}/sessions/{sessionId}",
		{
			params: { path: { id: accessId, sessionId } },
		},
	)
	if (error) throw error
	return data
}

export async function getSharedAccessInfo(token: string) {
	const { data, error } = await client.GET(
		"/api/shared-access/{token}/info",
		{
			params: { path: { token } },
		},
	)
	if (error) throw error
	if (!data) throw new Error("No data returned")
	return data
}

export async function verifySharedAccess(
	token: string,
	body: DTO["VerifySharedAccessDto"],
) {
	const { data, error } = await client.POST(
		"/api/shared-access/{token}/verify",
		{
			params: { path: { token } },
			body,
		},
	)
	if (error) throw error
	return data
}

export async function refreshSharedAccess(token: string) {
	const { data, error } = await client.POST(
		"/api/shared-access/{token}/refresh",
		{
			params: { path: { token } },
		},
	)
	if (error) throw error
	return data
}
