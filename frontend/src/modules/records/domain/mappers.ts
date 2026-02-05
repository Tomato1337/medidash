import type {
	UnifiedRecord,
	LocalRecord,
	ServerDocument,
	DisplayRecord,
} from "./types"
import type { FailedPhaseValues } from "@shared-types"
import { isLocalRecord } from "./guards"

// =============================================================================
// MAPPERS (pure functions)
// =============================================================================

export function toDisplayRecord(record: UnifiedRecord): DisplayRecord {
	if (isLocalRecord(record)) {
		return mapLocalRecordToDisplay(record)
	}
	return mapServerRecordToDisplay(record)
}

function mapLocalRecordToDisplay(record: LocalRecord): DisplayRecord {
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

function mapServerRecordToDisplay(
	record: Exclude<UnifiedRecord, LocalRecord>,
): DisplayRecord {
	return {
		id: record.id,
		title: record.title,
		description: record.description as string | undefined,
		summary: record.summary as string | undefined,
		date: record.date as Date | string | undefined,
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
		status: record.status,
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
