// =============================================================================
// Records Module - Public API
// =============================================================================

// Domain Layer - types, schemas, guards, mappers
export type {
	LocalRecord,
	ServerRecord,
	UnifiedRecord,
	DisplayRecord,
	DisplayDocument,
	CreateRecordInput,
} from "./domain/types"

export {
	localRecordSchema,
	idbDocumentSchema,
	idbTagSchema,
} from "./domain/schemas"

export { isLocalRecord, normalizeRecord } from "./domain/guards"
export { toDisplayRecord } from "./domain/mappers"

// Application Layer - use cases and query options
export {
	useRecords,
	useRecord,
	useCreateRecord,
	useRetryRecord,
	useDeleteLocalRecord,
	type GroupedRecords,
} from "./application/useRecords"

export {
	recordQueryOptions,
	recordsInfiniteQueryOptions,
	type RecordsPageData,
} from "./application/queries"

// Infrastructure Layer - pure API functions
export { getRecord, getRecords } from "./infrastructure/recordsApi"

export {
	subscribeToRecordProcessing,
	type ProcessingHandlers,
	type ProcessingEventData,
} from "./infrastructure/sse"
