import { useMutation, useQueryClient } from "@tanstack/react-query"
import { syncManager } from "@/shared/sw/syncManager"
import { db, type IDBRecord, type IDBTag } from "@/shared/lib/indexedDB"
import {
	DocumentStatus,
	FailedPhase,
	type FailedPhaseValues,
} from "@shared-types"

// =============================================================================
// TYPES
// =============================================================================

export interface CreateRecordInput {
	title: string
	description?: string
	files: File[]
	tags: IDBTag[]
	date?: Date
}

// =============================================================================
// CREATE RECORD
// =============================================================================

export function useCreateRecord() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (input: CreateRecordInput): Promise<IDBRecord> => {
			const id = crypto.randomUUID()

			const record: IDBRecord = {
				id,
				isLocal: true,
				title: input.title,
				description: input.description,
				documents: input.files.map((file) => ({
					id: crypto.randomUUID(),
					file,
					status: DocumentStatus.PENDING,
				})),
				tags: input.tags,
				createdAt: Date.now(),
				updatedAt: Date.now(),
				date: input.date,
				documentCount: input.files.length,
				status: DocumentStatus.PENDING,
				syncStatus: "pending",
				retryCount: 0,
			}

			await db.records.add(record)

			// Start background sync (non-blocking)
			syncManager.startSync(id, () => {
				console.log("revalidate", id)
				queryClient.invalidateQueries({ queryKey: ["record", id] })
			})

			return record
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["records"] })
		},
	})
}

// =============================================================================
// RETRY RECORD
// =============================================================================

export function useRetryRecord() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			recordId,
			phase,
		}: {
			recordId: string
			phase: FailedPhaseValues
		}) => {
			console.log("Retrying record", recordId, "phase", phase)

			if (phase === FailedPhase.COMPRESSING) {
				// Retry compression and then upload
				await syncManager.compress(recordId)
				await syncManager.upload(recordId)
			} else if (phase === FailedPhase.UPLOADING) {
				// Retry upload only
				await syncManager.upload(recordId)
			} else {
				// Server-side retry (PARSING or PROCESSING)
				await syncManager.retryServerProcessing(recordId, phase)
			}
		},
		onSuccess: (_, { recordId }) => {
			queryClient.invalidateQueries({ queryKey: ["record", recordId] })
			queryClient.invalidateQueries({ queryKey: ["records"] })
		},
	})
}

// =============================================================================
// DELETE LOCAL RECORD
// =============================================================================

export function useDeleteLocalRecord() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (recordId: string) => {
			await db.records.delete(recordId)
		},
		onSuccess: (_, recordId) => {
			queryClient.invalidateQueries({ queryKey: ["record", recordId] })
			queryClient.invalidateQueries({ queryKey: ["records"] })
		},
	})
}
