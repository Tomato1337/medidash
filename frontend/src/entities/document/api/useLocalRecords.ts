import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { db, type LocalRecord, type Tag } from "@/shared/lib/indexedDB"
import { compressFiles } from "@/shared/lib/imageCompression"
import { client } from "@/shared/api/api"
import { DocumentStatus } from "@shared-types"

export function useLocalRecords() {
	return useQuery({
		queryKey: ["local-records"],
		queryFn: async () => {
			const doc = await db.records.toArray()
			return doc ?? null
		},
		refetchInterval: (query) => {
			const doc = query.state.data as LocalRecord[] | null
			if (!doc) return false
			const isUpdating = doc.some(
				(d) =>
					d.status === DocumentStatus.COMPRESSING ||
					d.status === DocumentStatus.UPLOADING,
			)
			if (isUpdating) {
				return 1000
			}
			return false
		},
		staleTime: 0,
		refetchOnMount: true,
		refetchOnWindowFocus: true,
	})
}

export function useLocalRecord(id: string) {
	return useQuery({
		queryKey: ["local-record", id],
		queryFn: async () => {
			const doc = await db.records.get(id)
			return doc ?? null
		},
		// Polling только если документ в процессе обработки
		refetchInterval: (query) => {
			const doc = query.state.data as LocalRecord | null
			if (!doc) return false
			// Обновляем каждую секунду если идет компрессия или загрузка
			if (
				doc.status === DocumentStatus.COMPRESSING ||
				doc.status === DocumentStatus.UPLOADING
			) {
				return 1000
			}
			return false
		},
		staleTime: 0,
		refetchOnMount: true,
		refetchOnWindowFocus: true,
	})
}

export function useCreateLocalRecord() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (data: {
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
		}) => {
			const id = crypto.randomUUID()

			const localDoc: LocalRecord = {
				id,
				title: data.title,
				documentCount: data.files.length,
				date: data.date,
				isLocal: true,
				description: data.description,
				documents: data.files.map((file) => ({
					id: crypto.randomUUID(),
					file,
					status: DocumentStatus.PENDING,
				})),
				tags: data.tags,
				createdAt: Date.now(),
				updatedAt: Date.now(),
				status: DocumentStatus.PENDING,
			}

			await db.records.add(localDoc)
			return localDoc
		},
		onSuccess: (localDoc) => {
			queryClient.setQueryData(["local-record", localDoc.id], localDoc)
			queryClient.invalidateQueries({ queryKey: ["local-records"] })
		},
	})
}

export function useCompressLocalRecord() {
	const queryClient = useQueryClient()
	const upload = useUploadRecord()

	return useMutation({
		mutationFn: async (documentId: string) => {
			const doc = await db.records.get(documentId)
			if (!doc) throw new Error("Document not found")

			await db.records.update(documentId, {
				status: DocumentStatus.COMPRESSING,
				compressionStartedAt: Date.now(),
			})

			queryClient.invalidateQueries({
				queryKey: ["local-record", documentId],
			})
			queryClient.invalidateQueries({ queryKey: ["local-records"] })

			await db.records.update(documentId, {
				documents: doc.documents.map((f) => {
					const obj =
						f.status === DocumentStatus.PENDING ||
						f.status === DocumentStatus.FAILED
							? {
									compressionProgress: 0,
									status: DocumentStatus.COMPRESSING,
									compressionStartedAt: Date.now(),
								}
							: {}
					return {
						...f,
						...obj,
					}
				}),
			})

			queryClient.invalidateQueries({
				queryKey: ["local-record", documentId],
			})
			queryClient.invalidateQueries({ queryKey: ["local-records"] })

			try {
				const files =
					(await db.records.get(documentId))?.documents
						.filter((f) => f.status === DocumentStatus.COMPRESSING)
						.map((f) => f.file) || []

				const compressedBlobs = await compressFiles(
					files,
					async (fileIndex, progress) => {
						const currentDoc = await db.records.get(documentId)
						if (!currentDoc) return

						const updatedFiles = [...currentDoc.documents]
						const currentFile = updatedFiles[fileIndex]
						if (currentFile) {
							updatedFiles[fileIndex] = {
								...currentFile,
								compressionProgress: progress,
							}
							await db.records.update(documentId, {
								documents: updatedFiles,
							})
							queryClient.invalidateQueries({
								queryKey: ["local-record", documentId],
							})
							queryClient.invalidateQueries({
								queryKey: ["local-records"],
							})
						}
					},
					(fileIndex, error) => {
						console.error(
							`Compression error for file index ${fileIndex}: ${error}`,
						)
						db.records.get(documentId).then((currentDoc) => {
							if (!currentDoc) return
							const updatedFiles = [...currentDoc.documents]
							currentDoc.status = DocumentStatus.FAILED
							currentDoc.error = {
								type: DocumentStatus.COMPRESSING,
								message: error,
							}
							const currentFile = updatedFiles[fileIndex]
							if (currentFile) {
								updatedFiles[fileIndex] = {
									...currentFile,
									status: DocumentStatus.FAILED,
									error: {
										type: DocumentStatus.COMPRESSING,
										message: error,
									},
								}
								db.records.update(documentId, {
									documents: updatedFiles,
								})
							}
						})
					},
				)

				const updatedFiles = doc.documents.map((f, index) => ({
					...f,
					compressed: compressedBlobs[index],
					compressionProgress: 100,
					status: DocumentStatus.UPLOADING,
				}))

				await db.records.update(documentId, {
					documents: updatedFiles,
					status: DocumentStatus.UPLOADING,
				})

				upload.mutateAsync(documentId)

				return documentId
			} catch (error) {
				await db.records.update(documentId, {
					status: DocumentStatus.FAILED,
					error: {
						type: DocumentStatus.COMPRESSING,
						message:
							error instanceof Error
								? error.message
								: "Unknown error",
					},
				})
				queryClient.invalidateQueries({ queryKey: ["local-records"] })
				queryClient.invalidateQueries({
					queryKey: ["local-record", documentId],
				})
				throw error
			} finally {
				// Финальная инвалидация кэша
				queryClient.invalidateQueries({
					queryKey: ["local-record", documentId],
				})
				queryClient.invalidateQueries({ queryKey: ["local-records"] })
			}
		},
	})
}

// Хук для загрузки одного файла
export function useUploadFile() {
	const queryClient = useQueryClient()
	const deleteNode = useDeleteLocalRecord()

	return useMutation({
		mutationFn: async ({
			recordId,
			id,
		}: {
			recordId: string
			id: string
		}) => {
			console.log(recordId)
			const doc = await db.records.get(recordId)
			if (!doc) throw new Error("Document not found")
			console.log(id, doc.documents)
			const fileEntry = doc.documents.find((f) => f.id === id)
			if (!fileEntry) throw new Error("File not found")

			await db.records.update(recordId, {
				documents: doc.documents.map((f) =>
					f.id === id
						? { ...f, status: DocumentStatus.UPLOADING }
						: f,
				),
			})

			const fileToUpload = fileEntry.compressed ?? fileEntry.file

			try {
				const uploadUrlRes = await client.POST(
					"/api/documents/upload-url",
					{
						body: {
							recordId: doc.id,
							filename: fileEntry.file.name,
							mimetype: fileToUpload.type,
							fileSize: fileToUpload.size,
						},
					},
				)

				if (uploadUrlRes.error) {
					const error = uploadUrlRes.error as { message?: string }
					throw new Error(error.message ?? "Failed to get upload URL")
				}

				const { uploadUrl, documentId } = uploadUrlRes.data as any

				const uploadRes = await fetch(uploadUrl, {
					method: "PUT",
					body: fileToUpload,
				})

				if (!uploadRes.ok) {
					throw new Error(
						`Failed to upload to storage: ${uploadRes.statusText}`,
					)
				}

				const confirmRes = await client.GET(
					`/api/documents/{id}/confirm`,
					{
						params: {
							path: {
								id: String(documentId),
							},
						},
					},
				)

				if (confirmRes.error) {
					const error = confirmRes.error as { message?: string }
					throw new Error(error.message ?? "Failed to confirm upload")
				}

				const freshDoc = await db.records.get(recordId)
				if (!freshDoc) throw new Error("Document was deleted")

				const updatedDocuments = freshDoc.documents.map((file) => {
					if (file.id === id) {
						return {
							...file,
							status: DocumentStatus.PROCESSING,
						}
					}
					return file
				})

				// Проверяем, все ли файлы загружены
				const allProcessing = updatedDocuments.every(
					(d) => d.status === DocumentStatus.PROCESSING,
				)

				// Обновляем документ со всеми файлами и статусом записи
				await db.records.update(recordId, {
					documents: updatedDocuments,
					status: allProcessing
						? DocumentStatus.PROCESSING
						: DocumentStatus.UPLOADING,
				})

				console.log(
					`File ${fileEntry.file.name} uploaded. All processing: ${allProcessing}`,
				)

				// Если все файлы загружены, удаляем локальную запись
				if (allProcessing) {
					console.log("All files processed, deleting local record")
					deleteNode.mutate(recordId)
				}
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "Unknown error"

				console.error(
					`Upload error for file ${fileEntry.file.name}:`,
					errorMessage,
				)

				// Получаем свежие данные перед обновлением ошибки
				const freshDoc = await db.records.get(recordId)
				if (!freshDoc) return

				await db.records.update(recordId, {
					documents: freshDoc.documents.map((file) => {
						if (file.id === id) {
							return {
								...file,
								status: DocumentStatus.FAILED,
								error: {
									type: DocumentStatus.UPLOADING,
									message: errorMessage,
								},
							}
						}
						return file
					}),
				})
				throw error
			}
		},
		onSuccess: (_, { recordId }) => {
			queryClient.invalidateQueries({
				queryKey: ["local-record", recordId],
			})
			queryClient.invalidateQueries({ queryKey: ["local-records"] })
		},
	})
}

// Хук для загрузки документа на сервер
export function useUploadRecord() {
	const queryClient = useQueryClient()
	const upload = useUploadFile()

	return useMutation({
		retry: 0,
		mutationFn: async (documentId: string) => {
			const doc = await db.records.get(documentId)

			if (!doc) throw new Error("Document not found")

			console.log(
				`Starting upload for record ${documentId} with ${doc.documents.length} files`,
			)

			await db.records.update(documentId, {
				status: DocumentStatus.UPLOADING,
			})

			await db.records.update(documentId, {
				documents: doc.documents.map((f) => ({
					...f,
					status:
						f.status === DocumentStatus.PROCESSING
							? DocumentStatus.PROCESSING
							: DocumentStatus.UPLOADING,
				})),
			})
			const updatedDoc = await db.records.get(documentId)
			if (!updatedDoc) throw new Error("Document not found")
			console.log("Updated document status to UPLOADING", updatedDoc)
			const recordExists = await client.GET(`/api/records/{id}`, {
				params: {
					path: {
						id: documentId,
					},
				},
			})

			if (!recordExists.data || recordExists.error) {
				const recordRes = await client.POST("/api/records", {
					body: {
						recordId: documentId,
						title: doc.title,
						description: doc.description,
						tags: doc.tags.map((tag) => tag.id),
						date: doc.date
							? new Date(doc.date).toISOString()
							: undefined,
					},
				})
				if (recordRes.error) {
					throw new Error("Failed to create record on server")
				}
			}

			console.log(
				`Uploading ${doc.documents.length} files in parallel...`,
			)

			await Promise.all(
				updatedDoc.documents.map((f) =>
					f.status === DocumentStatus.UPLOADING
						? upload.mutateAsync({
								recordId: documentId,
								id: f.id,
							})
						: Promise.resolve(),
				),
			)

			console.log("All files uploaded, checking final state...")

			const result = await db.records.get(documentId)

			return result
		},
		onSuccess: (result) => {
			queryClient.invalidateQueries({
				queryKey: ["local-record", result?.id],
			})
			queryClient.invalidateQueries({ queryKey: ["local-records"] })
			queryClient.invalidateQueries({ queryKey: ["records"] })
		},
		onError: async (error, documentId) => {
			await db.records.update(documentId, {
				status: DocumentStatus.FAILED,
				documents:
					(await db.records.get(documentId))?.documents.map((f) => {
						if (f.status !== DocumentStatus.COMPRESSING) {
							return {
								...f,
								status: DocumentStatus.FAILED,
							}
						}
						return f
					}) || [],
				error: {
					type: DocumentStatus.UPLOADING,
					message:
						error instanceof Error
							? error.message
							: "Unknown error",
				},
			})
			queryClient.invalidateQueries({
				queryKey: ["local-record", documentId],
			})
			queryClient.invalidateQueries({ queryKey: ["local-records"] })
			queryClient.invalidateQueries({ queryKey: ["records"] })
		},
	})
}

// Хук для удаления локального документа
export function useDeleteLocalRecord() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (documentId: string) => {
			await db.records.delete(documentId)
			return documentId
		},
		onSuccess: (documentId) => {
			// Инвалидируем кэш удаленного документа
			queryClient.invalidateQueries({
				queryKey: ["local-record", documentId],
			})
			queryClient.invalidateQueries({ queryKey: ["local-records"] })
			queryClient.invalidateQueries({ queryKey: ["records"] })
		},
	})
}

// Комбинированный хук для полного процесса создания документа
export function useCreateAndUploadRecord() {
	const createLocal = useCreateLocalRecord()
	const compress = useCompressLocalRecord()

	return useMutation({
		mutationFn: async (data: {
			title: string
			description?: string
			files: File[]
			date: Date
			tags: Tag[]
		}) => {
			// 1. Создаем локальный документ
			const localDoc = await createLocal.mutateAsync(data)

			// 2. Сжимаем файлы
			compress.mutateAsync(localDoc.id)

			return localDoc
		},
	})
}
