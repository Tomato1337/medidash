// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export const DocumentStatus = {
	UPLOADING: "UPLOADING",
	COMPRESSING: "COMPRESSING",
	PENDING: "PENDING",
	PARSING: "PARSING",
	PROCESSING: "PROCESSING",
	COMPLETED: "COMPLETED",
	FAILED: "FAILED",
} as const

export type DocumentStatusValues =
	(typeof DocumentStatus)[keyof typeof DocumentStatus]

export const FailedPhase = {
	PARSING: "parsing",
	PROCESSING: "processing",
} as const

export type FailedPhaseValues = (typeof FailedPhase)[keyof typeof FailedPhase]
export type FailedPhase = FailedPhaseValues

// ============================================================================
// AUTH
// ============================================================================

export interface AuthenticatedUser {
	id: string
}

// ============================================================================
// PROCESSING JOBS
// ============================================================================

/** Job data для парсинга документа */
export interface ParsingJobData {
	documentId: string
	recordId: string
	userId: string
}

/** Job data для AI обработки всего Record */
export interface AiProcessingJobData {
	recordId: string
	userId: string
	documentIds: string[]
}

/** Устаревший интерфейс - используйте ParsingJobData или AiProcessingJobData */
export interface ProcessingJobData {
	documentId: string
	userId: string
	recordId: string
	fileUrl: string
	fileName: string
	mimeType: string
}

// ============================================================================
// AI PROCESSING
// ============================================================================

export interface AIProcessingResult {
	anonymizedText: string
	piiMappings: PiiMapping[]
	tags: string[]
	extractedDate: Date | null
	generatedTitle: string
	embedding: number[]
}

export interface PiiMapping {
	original: string
	replacement: string
	type: "NAME" | "ADDRESS" | "PHONE" | "EMAIL" | "DATE" | "ID" | "OTHER"
}

// ============================================================================
// SEARCH
// ============================================================================

export interface SearchQuery {
	query: string
	userId: string
	limit?: number
	offset?: number
	tags?: string[]
	dateFrom?: Date
	dateTo?: Date
}

export interface SearchResult {
	documentId: string
	recordId: string
	chunkId: string
	content: string
	score: number
	metadata: {
		title: string
		date: Date
		tags: string[]
	}
}

// ============================================================================
// DOCUMENT CHUNKS
// ============================================================================

export interface DocumentChunkData {
	content: string
	order: number
	embedding?: number[]
	documentId: string
}

// ============================================================================
// RECORD
// ============================================================================

export interface RecordSummary {
	recordId: string
	summary: string
	keyPoints: string[]
	documentCount: number
}

// ============================================================================
// EVENTS (Redis Pub/Sub)
// ============================================================================

export const ProcessingEventType = {
	// Parsing events
	PARSING_STARTED: "parsing:started",
	PARSING_DOCUMENT_STARTED: "parsing:document:started",
	PARSING_DOCUMENT_COMPLETED: "parsing:document:completed",
	PARSING_COMPLETED: "parsing:completed",
	PARSING_FAILED: "parsing:failed",
	// AI Processing events
	PROCESSING_STARTED: "processing:started",
	PROCESSING_COMPLETED: "processing:completed",
	PROCESSING_FAILED: "processing:failed",
	// Legacy events (deprecated)
	AI_PROCESSING_STARTED: "ai:started",
	AI_PROCESSING_PROGRESS: "ai:progress",
	AI_PROCESSING_COMPLETED: "ai:completed",
	AI_PROCESSING_FAILED: "ai:failed",
	RECORD_COMPLETED: "record:completed",
	RECORD_FAILED: "record:failed",
} as const

export type ProcessingEventTypeValues =
	(typeof ProcessingEventType)[keyof typeof ProcessingEventType]

/** Generic processing event type for flexibility */
export type ProcessingEventTypeString =
	| "parsing:started"
	| "parsing:document:started"
	| "parsing:document:completed"
	| "parsing:completed"
	| "parsing:failed"
	| "processing:started"
	| "processing:completed"
	| "processing:failed"

export interface ProcessingEvent {
	type: ProcessingEventTypeString
	recordId: string
	userId: string
	documentId?: string
	timestamp: string
	error?: string
	data?: Record<string, unknown>
}

// ============================================================================
// REDIS CHANNELS
// ============================================================================

export const RedisChannels = {
	/** Document Service → Processing Service: все документы Record готовы к парсингу */
	RECORD_READY_FOR_PARSING: "record.ready-for-parsing",
	/** Processing Service → API Gateway: события обработки для SSE */
	PROCESSING_EVENTS: "processing:events",
} as const
