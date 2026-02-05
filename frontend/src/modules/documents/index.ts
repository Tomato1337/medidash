// =============================================================================
// Documents Module - Public API
// =============================================================================

// Domain Layer
export type {
	Document,
	UploadFileInput,
	CreateLocalDocumentInput,
} from "./domain/types"

// Application Layer - use cases and query options
export { useDocumentDownload } from "./application/useDocumentDownload"
export { documentDownloadMutationOptions } from "./application/queries"
export { useCompressionRecovery } from "./application/useCompressionRecovery"

// Infrastructure Layer - pure API functions
export { getDocumentDownloadUrl } from "./infrastructure/documentsApi"

// UI Layer
export { FileCard } from "./ui/FileCard"
export { StatusBadge, type StatusBadgeProps } from "./ui/StatusBadge"
