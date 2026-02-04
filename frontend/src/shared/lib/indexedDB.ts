import {
	type DocumentStatusValues,
	type FailedPhaseValues,
} from "@shared-types"
import Dexie, { type Table } from "dexie"

// =============================================================================
// SYNC STATUS
// =============================================================================

export type SyncStatus =
	| "pending"
	| "compressing"
	| "uploading"
	| "synced"
	| "error"

// =============================================================================
// IDB DOCUMENT
// =============================================================================

export interface IDBDocument {
	id: string
	file: File
	compressed?: Blob
	status: DocumentStatusValues
	uploadProgress?: number
	errorMessage?: string
	errorPhase?: FailedPhaseValues
}

// =============================================================================
// IDB TAG
// =============================================================================

export interface IDBTag {
	id: string
	name: string
	description?: string | null
	color?: string | null
	isSystem: boolean
	createdAt: string
	updatedAt: string
}

// =============================================================================
// IDB RECORD
// =============================================================================

export interface IDBRecord {
	id: string
	isLocal: true
	title: string
	description?: string
	summary?: string
	documents: IDBDocument[]
	tags: IDBTag[]
	createdAt: number
	updatedAt: number
	date?: Date
	documentCount: number
	status: DocumentStatusValues
	// Sync fields
	syncStatus: SyncStatus
	errorPhase?: FailedPhaseValues
	errorMessage?: string
	retryCount: number
}

// =============================================================================
// QUERY CACHE (for TanStack Query persistence)
// =============================================================================

export interface QueryCache {
	id: string
	data: unknown
}

// =============================================================================
// DATABASE
// =============================================================================

class MedicalDocsDB extends Dexie {
	records!: Table<IDBRecord, string>
	queryCache!: Table<QueryCache, string>

	constructor() {
		super("medical-docs-db")
		this.version(2).stores({
			records: "id, createdAt, status, syncStatus",
			queryCache: "id",
		})
	}
}

export const db = new MedicalDocsDB()
