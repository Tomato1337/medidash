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
	RecordSortField,
	SortDirection,
	RecordsFilters,
} from "./domain/types"

export { DEFAULT_FILTERS } from "./domain/types"

export {
	localRecordSchema,
	idbDocumentSchema,
	idbTagSchema,
	recordsFiltersSchema,
} from "./domain/schemas"

export {
	isLocalRecord,
	normalizeRecord,
	hasActiveFilters,
	countActiveFilters,
} from "./domain/guards"
export { toDisplayRecord } from "./domain/mappers"

// Application Layer - use cases and query options
export {
	useRecords,
	useRecord,
	useCreateRecord,
	useRetryRecord,
	useDeleteLocalRecord,
	type GroupedRecords,
	type RecordsDataSource,
	type RecordDataSource,
} from "./application/useRecords"

export {
	recordQueryOptions,
	recordsInfiniteQueryOptions,
	type RecordsPageData,
} from "./application/queries"

// Infrastructure Layer - pure API functions
export {
	getRecord,
	getRecords,
	type RecordsListParams,
} from "./infrastructure/recordsApi"

export {
	subscribeToRecordProcessing,
	type ProcessingHandlers,
	type ProcessingEventData,
} from "./infrastructure/sse"
