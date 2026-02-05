import { useMutation, useQueryClient } from "@tanstack/react-query"
import { db, type IDBRecord, type IDBTag } from "@/shared/lib/indexedDB"
import {
	DocumentStatus,
	FailedPhase,
	type FailedPhaseValues,
} from "@shared-types"
import type { CreateRecordInput } from "../domain"
import { syncManager } from "@/modules/offline"
import { queryKeys } from "@/shared/api/queries"

// =============================================================================
// SYNC MUTATIONS (infrastructure adapters)
// =============================================================================

export function createRecordMutation(
	queryClient: ReturnType<typeof useQueryClient>,
) {
	return {
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
				tags: input.tags as IDBTag[],
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
				queryClient.invalidateQueries({
					queryKey: queryKeys.records.detail(id),
				})
			})

			return record
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.records.all })
		},
	}
}

export function retryRecordMutation(
	queryClient: ReturnType<typeof useQueryClient>,
) {
	return {
		mutationFn: async ({
			recordId,
			phase,
		}: {
			recordId: string
			phase: FailedPhaseValues
		}) => {
			console.log("Retrying record", recordId, "phase", phase)

			if (phase === FailedPhase.COMPRESSING) {
				await syncManager.compress(recordId)
				await syncManager.upload(recordId)
			} else if (phase === FailedPhase.UPLOADING) {
				await syncManager.upload(recordId)
			} else {
				await syncManager.retryServerProcessing(recordId, phase)
			}
		},
		onSuccess: (_: void, { recordId }: { recordId: string }) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.records.detail(recordId),
			})
			queryClient.invalidateQueries({ queryKey: queryKeys.records.all })
		},
	}
}

export function deleteLocalRecordMutation(
	queryClient: ReturnType<typeof useQueryClient>,
) {
	return {
		mutationFn: async (recordId: string) => {
			await db.records.delete(recordId)
		},
		onSuccess: (_: void, recordId: string) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.records.detail(recordId),
			})
			queryClient.invalidateQueries({ queryKey: queryKeys.records.all })
		},
	}
}
