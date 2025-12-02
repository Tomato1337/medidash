// export enum DocumentStatus {
// 	UPLOADING = "UPLOADING",
// 	PROCESSING = "PROCESSING",
// 	COMPLETED = "COMPLETED",
// 	FAILED = "FAILED",
// }

export const DocumentStatus = {
	UPLOADING: "UPLOADING",
	PENDING: "PENDING",
	PROCESSING: "PROCESSING",
	COMPLETED: "COMPLETED",
	COMPRESSING: "COMPRESSING",
	FAILED: "FAILED",
} as const

export type DocumentStatusValues = {
	[K in keyof typeof DocumentStatus]: (typeof DocumentStatus)[K]
}[keyof typeof DocumentStatus]
export interface AuthenticatedUser {
	id: string
}

export interface ProcessingJobData {
	documentId: string
	userId: string
	recordId: string
	fileUrl: string
	fileName: string
	mimeType: string
}

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

export interface DocumentChunkData {
	content: string
	order: number
	embedding?: number[]
	documentId: string
}

export interface RecordSummary {
	recordId: string
	summary: string
	keyPoints: string[]
	documentCount: number
}
