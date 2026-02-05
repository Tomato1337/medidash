import type { UnifiedRecord, LocalRecord } from "./types"
import { localRecordSchema } from "./schemas"

// =============================================================================
// TYPE GUARDS
// =============================================================================

export function isLocalRecord(data: UnifiedRecord): data is LocalRecord {
	return "isLocal" in data && data.isLocal === true
}

// =============================================================================
// NORMALIZER
// =============================================================================

export function normalizeRecord(data: unknown): UnifiedRecord {
	console.log("normalizeRecord", data)
	const parseResult = localRecordSchema.safeParse(data)
	if (parseResult.success) {
		return parseResult.data
	}
	return data as Exclude<UnifiedRecord, LocalRecord>
}
