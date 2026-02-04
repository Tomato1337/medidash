import { z } from "zod"
import type { DTO } from "@/shared/api/api"
import type { IDBRecord, IDBDocument, IDBTag } from "@/shared/lib/indexedDB"
import {
	DocumentStatus,
	FailedPhase,
	type DocumentStatusValues,
	type FailedPhaseValues,
} from "@shared-types"

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

const idbDocumentSchema = z.object({
	id: z.string(),
	file: z.instanceof(File),
	compressed: z.instanceof(Blob).optional(),
	status: z.nativeEnum(DocumentStatus),
	uploadProgress: z.number().optional(),
	errorMessage: z.string().optional(),
	errorPhase: z.nativeEnum(FailedPhase).optional(),
})

const idbTagSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable().optional(),
	color: z.string().nullable().optional(),
	isSystem: z.boolean(),
	createdAt: z.string(),
	updatedAt: z.string(),
})

export const localRecordSchema = z.object({
	id: z.string(),
	isLocal: z.literal(true),
	title: z.string(),
	description: z.string().optional(),
	summary: z.string().optional(),
	documents: z.array(idbDocumentSchema),
	tags: z.array(idbTagSchema),
	createdAt: z.number(),
	updatedAt: z.number(),
	date: z.date().optional(),
	documentCount: z.number(),
	status: z.nativeEnum(DocumentStatus),
	syncStatus: z.enum([
		"pending",
		"compressing",
		"uploading",
		"synced",
		"error",
	]),
	errorPhase: z.nativeEnum(FailedPhase).optional(),
	errorMessage: z.string().optional(),
	retryCount: z.number(),
})

// =============================================================================
// TYPES
// =============================================================================

export type LocalRecord = z.infer<typeof localRecordSchema>
export type ServerRecord = DTO["RecordResponseDto"]
export type ServerDocument = DTO["DocumentResponseDto"]
export type UnifiedRecord = ServerRecord | LocalRecord

// =============================================================================
// TYPE GUARDS (using Zod)
// =============================================================================

export function isLocalRecord(data: unknown): data is LocalRecord {
	return localRecordSchema.safeParse(data).success
}

// =============================================================================
// NORMALIZER
// =============================================================================

export function normalizeRecord(data: unknown): UnifiedRecord {
	const parseResult = localRecordSchema.safeParse(data)
	if (parseResult.success) {
		return parseResult.data
	}
	return data as ServerRecord
}

// =============================================================================
// DISPLAY TYPES (unified for UI)
// =============================================================================

export interface DisplayDocument {
	id: string
	fileName: string
	originalFileName: string
	mimeType: string
	fileSize: number
	status: DocumentStatusValues
	uploadProgress?: number
	errorMessage?: string | null
	createdAt: string
	updatedAt: string
}

export interface DisplayRecord {
	id: string
	title: string
	description?: string | null
	summary?: string | null
	date?: Date | string | null
	createdAt: string
	updatedAt: string
	status: DocumentStatusValues
	documentCount: number
	documents: DisplayDocument[]
	tags: string[]
	isLocal: boolean
	errorPhase?: FailedPhaseValues
	syncStatus?: string
}

// =============================================================================
// MAPPER
// =============================================================================

export function getRecordDisplayData(record: UnifiedRecord): DisplayRecord {
	if (isLocalRecord(record)) {
		return {
			id: record.id,
			title: record.title,
			description: record.description,
			summary: record.summary,
			date: record.date,
			createdAt: new Date(record.createdAt).toISOString(),
			updatedAt: new Date(record.updatedAt).toISOString(),
			status: record.status,
			documentCount: record.documentCount,
			documents: record.documents.map((d) => ({
				id: d.id,
				fileName: d.file.name,
				originalFileName: d.file.name,
				mimeType: d.file.type,
				fileSize: d.file.size,
				status: d.status,
				uploadProgress: d.uploadProgress,
				errorMessage: d.errorMessage,
				createdAt: new Date(record.createdAt).toISOString(),
				updatedAt: new Date(record.updatedAt).toISOString(),
			})),
			tags: record.tags.map((t) => t.name),
			isLocal: true,
			errorPhase: record.errorPhase,
			syncStatus: record.syncStatus,
		}
	}

	// Server record
	return {
		id: record.id,
		title: record.title,
		description: record.description as string | undefined,
		summary: record.summary as string | undefined,
		date: record.date as Date | string | undefined,
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
		status: record.status as DocumentStatusValues,
		documentCount: record.documentCount,
		documents: (record.documents as ServerDocument[]).map((d) => ({
			id: d.id,
			fileName: d.fileName,
			originalFileName: d.originalFileName,
			mimeType: d.mimeType,
			fileSize: d.fileSize,
			status: d.status,
			errorMessage: d.errorMessage as string | undefined,
			createdAt: d.createdAt,
			updatedAt: d.updatedAt,
		})),
		tags: record.tags as string[],
		isLocal: false,
		errorPhase: record.failedPhase as FailedPhaseValues | undefined,
	}
}
