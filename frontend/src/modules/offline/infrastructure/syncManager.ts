import { db, type IDBRecord, type IDBDocument } from "@/shared/lib/indexedDB"
import { client } from "@/shared/api/api"
import { getCompressionWorkerManager } from "@/shared/lib/compressionWorkerManager"
import {
	DocumentStatus,
	FailedPhase,
	type FailedPhaseValues,
} from "@shared-types"

// =============================================================================
// SYNC MANAGER
// =============================================================================

export class SyncManager {
	private isRunning = false

	// =========================================================================
	// MAIN SYNC FLOW
	// =========================================================================

	async startSync(recordId: string, revalidate: () => void): Promise<void> {
		if (this.isRunning) {
			console.log("SyncManager: Already running, skipping")
			return
		}

		this.isRunning = true
		console.log("SyncManager: Starting sync for", recordId)

		try {
			await this.compress(recordId, revalidate)
			await this.upload(recordId, revalidate)
		} catch (error) {
			console.error("SyncManager: Sync failed:", error)
		} finally {
			this.isRunning = false
			revalidate()
		}
	}

	// =========================================================================
	// COMPRESSION
	// =========================================================================

	async compress(recordId: string, revalidate?: () => void): Promise<void> {
		try {
			const record = await db.records.get(recordId)
			if (!record) throw new Error("Record not found")

			// Get documents to compress (PENDING or FAILED with compression error)
			const docsToCompress = record.documents.filter(
				(d) =>
					d.status === DocumentStatus.PENDING ||
					(d.status === DocumentStatus.FAILED &&
						d.errorPhase === FailedPhase.COMPRESSING),
			)

			if (docsToCompress.length === 0) {
				console.log("SyncManager: No documents to compress")
				return
			}

			// Update record status
			await db.records.update(recordId, {
				status: DocumentStatus.COMPRESSING,
				syncStatus: "compressing",
			})

			// Update their status to COMPRESSING
			await db.records.update(recordId, {
				documents: record.documents.map((d) =>
					docsToCompress.some((dc) => dc.id === d.id)
						? { ...d, status: DocumentStatus.COMPRESSING }
						: d,
				),
			})

			const manager = getCompressionWorkerManager()

			for (const doc of docsToCompress) {
				try {
					console.log("SyncManager: Compressing", doc.file.name)
					const compressed = await manager.compressFile(doc.file)

					const current = await db.records.get(recordId)
					if (!current) return

					await db.records.update(recordId, {
						documents: current.documents.map((d) =>
							d.id === doc.id
								? {
										...d,
										compressed,
										status: DocumentStatus.UPLOADING,
									}
								: d,
						),
					})

					console.log("SyncManager: Compressed", doc.file.name)
				} catch (error) {
					await this.setDocumentError(
						recordId,
						doc.id,
						FailedPhase.COMPRESSING,
						error,
					)
					throw error
				}
			}

			// Update record status to uploading
			await db.records.update(recordId, {
				status: DocumentStatus.UPLOADING,
				syncStatus: "uploading",
			})
		} catch (error) {
			console.error("SyncManager: Error compressing:", error)
			const allDocuments = await db.records.get(recordId)
			allDocuments?.documents.forEach((doc) => {
				this.setDocumentError(
					recordId,
					doc.id,
					FailedPhase.COMPRESSING,
					error,
				)
			})
			throw error
		} finally {
			revalidate?.()
		}
	}

	// =========================================================================
	// UPLOAD
	// =========================================================================

	async upload(recordId: string, revalidate?: () => void): Promise<void> {
		try {
			const record = await db.records.get(recordId)
			if (!record) throw new Error("Record not found")

			console.log("UPLOADING")

			// Ensure record exists on server
			await this.ensureServerRecord(record)

			// Get documents to upload (UPLOADING or FAILED with upload error)
			const docsToUpload = record.documents.filter(
				(d) =>
					d.status === DocumentStatus.UPLOADING ||
					(d.status === DocumentStatus.FAILED &&
						d.errorPhase === FailedPhase.UPLOADING),
			)

			if (docsToUpload.length === 0) {
				console.log("SyncManager: No documents to upload")
				return
			}

			// Reset failed docs to UPLOADING
			const hasFailedDocs = docsToUpload.some(
				(d) => d.status === DocumentStatus.FAILED,
			)
			if (hasFailedDocs) {
				await db.records.update(recordId, {
					documents: record.documents.map((d) =>
						docsToUpload.some((du) => du.id === d.id)
							? {
									...d,
									status: DocumentStatus.UPLOADING,
									errorPhase: undefined,
									errorMessage: undefined,
								}
							: d,
					),
				})
			}

			// Upload each document
			for (const doc of docsToUpload) {
				await this.uploadDocument(recordId, doc, revalidate)
			}

			// Check if all done
			const updated = await db.records.get(recordId)
			if (!updated) return

			const allProcessing = updated.documents.every(
				(d) => d.status === DocumentStatus.PROCESSING,
			)

			if (allProcessing) {
				console.log(
					"SyncManager: All documents uploaded, deleting local record",
				)
				await db.records.delete(recordId)
			}
		} catch (error) {
			console.error("SyncManager: Error uploading:", error)
			const allDocuments = await db.records.get(recordId)
			allDocuments?.documents.forEach((doc) => {
				this.setDocumentError(
					recordId,
					doc.id,
					FailedPhase.UPLOADING,
					error,
				)
			})
			throw error
		} finally {
			revalidate?.()
		}
	}

	private async uploadDocument(
		recordId: string,
		doc: IDBDocument,
		revalidate?: () => void,
	): Promise<void> {
		try {
			const fileToUpload = doc.compressed ?? doc.file

			console.log("SyncManager: Getting presigned URL for", doc.file.name)

			// 1. Get presigned URL
			const urlRes = await client.POST("/api/documents/upload-url", {
				body: {
					recordId,
					filename: doc.file.name,
					mimetype: fileToUpload.type,
					fileSize: fileToUpload.size,
				},
			})

			if (urlRes.error) {
				throw new Error("Failed to get upload URL")
			}

			const { uploadUrl, documentId } = urlRes.data as unknown as {
				uploadUrl: string
				documentId: string
			}

			console.log("SyncManager: Uploading to S3", doc.file.name)

			// 2. Upload to S3
			const uploadRes = await fetch(uploadUrl, {
				method: "PUT",
				body: fileToUpload,
			})

			if (!uploadRes.ok) {
				throw new Error(`Upload failed: ${uploadRes.statusText}`)
			}

			console.log("SyncManager: Confirming upload", doc.file.name)

			// 3. Confirm upload
			await client.GET("/api/documents/{id}/confirm", {
				params: { path: { id: documentId } },
			})

			// 4. Update document status
			const current = await db.records.get(recordId)
			if (!current) return

			await db.records.update(recordId, {
				documents: current.documents.map((d) =>
					d.id === doc.id
						? { ...d, status: DocumentStatus.PROCESSING }
						: d,
				),
			})

			console.log("SyncManager: Upload complete for", doc.file.name)
		} catch (error) {
			await this.setDocumentError(
				recordId,
				doc.id,
				FailedPhase.UPLOADING,
				error,
			)
			throw error
		} finally {
			revalidate?.()
		}
	}

	private async ensureServerRecord(record: IDBRecord): Promise<void> {
		console.log("SyncManager: Creating record on server", record.id)

		try {
			const data = await client.POST("/api/records", {
				body: {
					recordId: record.id,
					title: record.title,
					description: record.description,
					tags: record.tags.map((t) => t.id),
					date: record.date?.toISOString() as string,
				},
			})

			// 409 Conflict means record already exists - that's OK
			if (data.response.status === 409) {
				console.log(
					"SyncManager: Record already exists on server (409)",
				)
				return
			}

			if (!data.response.ok) {
				throw new Error(`Failed to create record: ${data.error}`)
			}

			console.log("SyncManager: Record created on server", record.id)
		} catch (error) {
			console.error("SyncManager: Error creating record:", error)
			throw error
		}
	}

	// =========================================================================
	// RETRY SERVER PROCESSING
	// =========================================================================

	async retryServerProcessing(
		recordId: string,
		phase: FailedPhaseValues,
	): Promise<void> {
		console.log("SyncManager: Retrying server processing", recordId, phase)

		await client.POST("/api/processing/records/{recordId}/retry/{phase}", {
			params: { path: { recordId, phase: phase as any } },
			body: {} as any,
		})
	}

	// =========================================================================
	// ERROR HANDLING
	// =========================================================================

	private async setDocumentError(
		recordId: string,
		docId: string,
		phase: FailedPhaseValues,
		error: unknown,
	): Promise<void> {
		const current = await db.records.get(recordId)
		if (!current) return

		const errorMessage =
			error instanceof Error ? error.message : "Unknown error"

		console.error("SyncManager: Document error", docId, phase, errorMessage)

		await db.records.update(recordId, {
			status: DocumentStatus.FAILED,
			syncStatus: "error",
			errorPhase: phase,
			errorMessage,
			documents: current.documents.map((d) =>
				d.id === docId
					? {
							...d,
							status: DocumentStatus.FAILED,
							errorPhase: phase,
							errorMessage,
						}
					: d,
			),
		})
	}
}

// =============================================================================
// SINGLETON
// =============================================================================

export const syncManager = new SyncManager()
