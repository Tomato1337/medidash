import { z } from "zod"
import type { DTO } from "@/shared/api/api"
import type { DocumentStatusValues, FailedPhaseValues } from "@shared-types"
import { localRecordSchema } from "./schemas"

// =============================================================================
// DOMAIN TYPES
// =============================================================================

export type LocalRecord = z.infer<typeof localRecordSchema>
export type ServerRecord = DTO["RecordResponseDto"]
export type ServerDocument = DTO["DocumentResponseDto"]
export type UnifiedRecord = ServerRecord | LocalRecord

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
// INPUT TYPES
// =============================================================================

export interface CreateRecordInput {
	title: string
	description?: string
	files: File[]
	tags: Array<{
		id: string
		name: string
		description?: string | null
		color?: string | null
		isSystem: boolean
		createdAt: string
		updatedAt: string
	}>
	date?: Date
}
