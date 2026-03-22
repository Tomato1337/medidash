// =============================================================================
// Shared Access Module - Public API
// =============================================================================

// Domain Layer
export type {
	SharedAccess,
	SharedAccessSession,
	SharedAccessPublicStatus,
	SharedAccessInfo,
	CreateSharedAccessInput,
	VerifySharedAccessInput,
	CreateSharedAccessResponse,
} from "./domain/types"
export {
	createSharedAccessSchema,
	verifySharedAccessSchema,
	type CreateSharedAccessForm,
	type VerifySharedAccessForm,
} from "./domain/schemas"

// Application Layer
export {
	useSharedAccessList,
	useSharedAccessSessions,
	useSharedAccessInfo,
	useSharedCheckAuth,
	useCreateSharedAccess,
	useRevokeSharedAccess,
	useRevokeSharedAccessSession,
} from "./application/useSharedAccess"
export {
	ViewModeProvider,
	useViewMode,
	type ViewMode,
} from "./application/viewModeContext"
export {
	sharedAccessListQueryOptions,
	sharedAccessSessionsQueryOptions,
} from "./application/queries"

// Infrastructure Layer
export {
	createSharedAccess,
	listSharedAccesses,
	revokeSharedAccess,
	listSharedAccessSessions,
	revokeSharedAccessSession,
	getSharedAccessInfo,
	verifySharedAccess,
	refreshSharedAccess,
} from "./infrastructure/sharedAccessApi"
export { getSharedAccessClient } from "./infrastructure/sharedAccessApiClient"
export { getSharedRecords, getSharedRecord } from "./infrastructure/sharedRecordsApi"
export { getSharedDocumentDownloadUrl } from "./infrastructure/sharedDocumentsApi"
export { subscribeToSharedAccessEvents } from "./infrastructure/sse"

// UI Layer
export { GuestLayout } from "./ui/GuestLayout"
export { GuestSidebar } from "./ui/GuestSidebar"
