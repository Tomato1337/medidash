import type { DocumentStatusValues } from "@shared-types"

// =============================================================================
// DOMAIN TYPES
// =============================================================================

export interface Document {
	id: string
	fileName: string
	originalFileName: string
	mimeType: string
	fileSize: number
	status: DocumentStatusValues
	uploadProgress?: number
	compressionProgress?: number
	errorMessage?: string | null
	createdAt: string
	updatedAt: string
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface UploadFileInput {
	recordId: string
	fileId: string
}

export interface CreateLocalDocumentInput {
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
	date: Date
}
