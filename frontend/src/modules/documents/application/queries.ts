import { mutationOptions } from "@tanstack/react-query"
import { mutationKeys } from "@/shared/api/queries"
import { getDocumentDownloadUrl } from "../infrastructure/documentsApi"

// =============================================================================
// DOWNLOAD DOCUMENT MUTATION OPTIONS
// =============================================================================

export const documentDownloadMutationOptions = () =>
	mutationOptions({
		mutationKey: mutationKeys.documents.download,
		mutationFn: (documentId: string) => getDocumentDownloadUrl(documentId),
	})
