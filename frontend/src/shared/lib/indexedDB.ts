import { type DocumentStatusValues, DocumentStatus } from "@shared-types"
import Dexie, { type Table } from "dexie"
type Status = "pending" | "compressing" | "uploading" | "error" | "done"

export interface Tag {
	id: string
	name: string
	description?: string | null
	color?: string | null
	isSystem: boolean
	createdAt: string
	updatedAt: string
}

export interface LocalRecord {
	id: string
	isLocal?: boolean
	title: string
	description?: string
	summary?: string
	documents: Array<{
		id: string
		file: File
		compressed?: Blob
		status: DocumentStatusValues
		error?: {
			message: string
			type: Omit<Status, (typeof DocumentStatus)["COMPLETED"]>
		}
		compressionProgress?: number
		compressionStartedAt?: number
	}>
	tags: Tag[]
	createdAt: number
	updatedAt: number
	date?: Date
	documentCount: number
	status: DocumentStatusValues
	error?: {
		message: string
		type: Omit<Status, (typeof DocumentStatus)["COMPLETED"]>
	}
	uploadProgress?: number
	compressionStartedAt?: number
}

export interface QueryCache {
	id: string
	data: unknown
}

class MedicalDocsDB extends Dexie {
	records!: Table<LocalRecord, string>
	queryCache!: Table<QueryCache, string>

	constructor() {
		super("medical-docs-db")
		this.version(1).stores({
			records: "id, createdAt, status",
			queryCache: "id",
		})
	}
}

export const db = new MedicalDocsDB()
