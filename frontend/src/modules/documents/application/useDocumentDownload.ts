import { useMutation } from "@tanstack/react-query"
import { documentDownloadMutationOptions } from "./queries"

// =============================================================================
// DOCUMENT DOWNLOAD USE CASE
// =============================================================================

/**
 * Use Case: Download a document
 * Opens the download URL in a new tab
 */
export function useDocumentDownload() {
	const mutation = useMutation(documentDownloadMutationOptions())

	const download = async (documentId: string) => {
		const data = await mutation.mutateAsync(documentId)
		if (data?.downloadUrl) {
			window.open(data.downloadUrl, "_blank")
		}
	}

	return {
		download,
		isLoading: mutation.isPending,
		error: mutation.error,
	}
}
