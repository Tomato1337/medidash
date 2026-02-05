import { client } from "@/shared/api/api"

// =============================================================================
// DOCUMENTS API - Pure functions for API calls
// =============================================================================

/**
 * Get download URL for a document
 */
export async function getDocumentDownloadUrl(documentId: string) {
	const { data, error } = await client.GET(
		"/api/documents/{id}/download-url",
		{
			params: { path: { id: documentId } },
		},
	)

	if (error) throw error
	return data
}
