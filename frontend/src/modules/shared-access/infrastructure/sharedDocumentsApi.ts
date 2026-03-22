import { getSharedAccessClient } from "./sharedAccessApiClient"

export async function getSharedDocumentDownloadUrl(
	token: string,
	documentId: string,
) {
	const client = getSharedAccessClient(token)
	// Прокси-эндпоинт — ответ приходит из document-service, тип в схеме отсутствует
	const { data, error } = await client.GET(
		"/api/shared-access/{token}/documents/{documentId}/download-url",
		{
			params: { path: { token, documentId } },
		},
	)
	if (error) throw error
	if (!data) throw new Error("No data returned")
	return data as unknown as { downloadUrl?: string }
}
