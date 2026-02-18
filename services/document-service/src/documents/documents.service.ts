import {
	Injectable,
	Logger,
	NotFoundException,
	BadRequestException,
	Inject,
	forwardRef,
} from "@nestjs/common"
import { PrismaService } from "../prisma/prisma.service"
import { MinioService } from "../minio/minio.service"
import { RedisService } from "../redis/redis.service"
import { EnvService } from "../env/env.service"
import { DocumentResponseDto } from "./dto/document.dto"
import { randomUUID } from "crypto"
import { Readable } from "stream"
import { Document } from "generated/prisma"
import { FailedPhase, RedisChannels } from "@shared-types"

@Injectable()
export class DocumentsService {
	private readonly logger = new Logger(DocumentsService.name)
	private readonly MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
	private readonly LARGE_FILE_THRESHOLD = 10 * 1024 * 1024 // 10MB

	constructor(
		private prisma: PrismaService,
		private minio: MinioService,
		@Inject(forwardRef(() => RedisService))
		private redis: RedisService,
		private env: EnvService,
	) {}

	private get minioBaseUrl(): string {
		const endpoint = this.env.get("MINIO_ENDPOINT")
		const port = this.env.get("MINIO_PORT")
		const bucket = this.env.get("MINIO_BUCKET_NAME")
		return `http://${endpoint}:${port}/${bucket}`
	}

	/**
	 * Upload document using streaming (рекомендуется)
	 * Не загружает весь файл в память
	 */
	async uploadDocumentStream(
		userId: string,
		recordId: string,
		file: {
			filename: string
			mimetype: string
			file: NodeJS.ReadableStream // Stream от Fastify multipart
		},
		description?: string,
	): Promise<DocumentResponseDto> {
		// Verify record belongs to user
		const record = await this.prisma.record.findFirst({
			where: {
				id: recordId,
				userId,
				deletedAt: null,
			},
		})

		if (!record) {
			throw new NotFoundException(`Record ${recordId} not found`)
		}

		// Validate file type
		const allowedMimeTypes = [
			"application/pdf",
			"text/plain",
			"image/jpeg",
			"image/png",
			"image/webp",
			"image/avif",
		]
		if (!allowedMimeTypes.includes(file.mimetype)) {
			throw new BadRequestException(
				"Only PDF, TXT, and image files are allowed",
			)
		}

		// Generate unique filename
		const fileExtension =
			file.mimetype === "application/pdf" ? "pdf" : "txt"
		const uniqueFilename = `${randomUUID()}.${fileExtension}`
		const minioObjectKey = `records/${recordId}/${uniqueFilename}`

		// Получаем размер файла через stream
		let fileSize = 0
		const chunks: Buffer[] = []

		// Читаем stream и собираем размер
		// Для production лучше использовать temporary file или проверять size заранее
		for await (const chunk of file.file) {
			const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
			chunks.push(buffer)
			fileSize += buffer.length

			// Проверка максимального размера
			if (fileSize > this.MAX_FILE_SIZE) {
				throw new BadRequestException(
					`File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`,
				)
			}
		}

		// Создаем новый stream из собранных данных
		const fileBuffer = Buffer.concat(chunks)
		const uploadStream = Readable.from(fileBuffer)

		// Upload to MinIO using stream
		await this.minio.uploadStream(minioObjectKey, uploadStream, fileSize, {
			"Content-Type": file.mimetype,
			"X-Original-Filename": file.filename,
		})

		// Create document record
		const document = await this.prisma.document.create({
			data: {
				recordId,
				userId,
				title: file.filename,
				fileName: uniqueFilename,
				originalFileName: file.filename,
				mimeType: file.mimetype,
				fileSize,
				minioUrl: `${this.minioBaseUrl}/${minioObjectKey}`,
				minioBucket: "medical-documents",
				minioObjectKey,
				description,
				status: "UPLOADING",
			},
		})

		this.logger.log(
			`✅ Uploaded document ${document.id} to record ${recordId} (${(fileSize / 1024 / 1024).toFixed(2)}MB)`,
		)

		return this.mapToResponseDto(document)
	}

	async getDocument(
		documentId: string,
		userId: string,
	): Promise<DocumentResponseDto & { minioObjectKey: string }> {
		const document = await this.prisma.document.findFirst({
			where: {
				id: documentId,
				userId,
				deletedAt: null,
			},
		})

		if (!document) {
			throw new NotFoundException(`Document ${documentId} not found`)
		}

		return {
			...this.mapToResponseDto(document),
			minioObjectKey: document.minioObjectKey,
		}
	}

	async getRecordDocuments(
		recordId: string,
		userId: string,
	): Promise<DocumentResponseDto[]> {
		// Verify record belongs to user
		const record = await this.prisma.record.findFirst({
			where: {
				id: recordId,
				userId,
				deletedAt: null,
			},
		})

		if (!record) {
			throw new NotFoundException(`Record ${recordId} not found`)
		}

		const documents = await this.prisma.document.findMany({
			where: {
				recordId,
				deletedAt: null,
			},
			orderBy: {
				createdAt: "desc",
			},
		})

		return documents.map(this.mapToResponseDto)
	}

	async downloadDocument(
		documentId: string,
		userId: string,
	): Promise<{ buffer: Buffer; filename: string; mimetype: string }> {
		const document = await this.getDocument(documentId, userId)

		const buffer = await this.minio.downloadFile(document?.minioObjectKey)

		return {
			buffer,
			filename: document.originalFileName,
			mimetype: document.mimeType,
		}
	}

	/**
	 * Получить presigned URL для скачивания файла
	 * Более безопасный способ - клиент скачивает напрямую из MinIO с временной ссылкой
	 */
	async getDownloadUrl(
		documentId: string,
		userId: string,
		expirySeconds = 3600, // 1 час по умолчанию
	): Promise<{
		downloadUrl: string
		expiresIn: number
		filename: string
		mimeType: string
	}> {
		const document = await this.getDocument(documentId, userId)

		const downloadUrl = await this.minio.getFileUrl(
			document.minioObjectKey,
			expirySeconds,
		)

		this.logger.log(
			`✅ Generated download URL for document ${documentId} (expires in ${expirySeconds}s)`,
		)

		return {
			downloadUrl,
			expiresIn: expirySeconds,
			filename: document.originalFileName,
			mimeType: document.mimeType,
		}
	}

	async deleteDocument(documentId: string, userId: string): Promise<void> {
		const document = await this.getDocument(documentId, userId)

		// Delete from MinIO
		await this.minio.deleteFile(document.minioObjectKey)

		// Soft delete in database
		await this.prisma.document.update({
			where: { id: documentId },
			data: {
				deletedAt: new Date(),
			},
		})

		this.logger.log(`✅ Deleted document ${documentId}`)
	}

	/**
	 * Получить pre-signed URL для прямой загрузки большого файла
	 * Клиент загружает файл напрямую в MinIO, затем вызывает confirmUpload
	 */
	async getUploadUrl(
		userId: string,
		recordId: string,
		fileName: string,
		mimeType: string,
		fileSize: number,
	): Promise<{
		uploadUrl: string
		documentId: string
		objectKey: string
		expiresIn: number
	}> {
		// Verify record belongs to user
		const record = await this.prisma.record.findFirst({
			where: {
				id: recordId,
				userId,
				deletedAt: null,
			},
		})

		if (!record) {
			throw new NotFoundException(`Record ${recordId} not found`)
		}

		// Validate file type
		const allowedMimeTypes = [
			"application/pdf",
			"text/plain",
			"image/jpeg",
			"image/png",
			"image/webp",
			"image/avif",
		]

		if (!allowedMimeTypes.includes(mimeType)) {
			throw new BadRequestException("Only PDF and TXT files are allowed")
		}

		// Validate file size
		if (fileSize > this.MAX_FILE_SIZE) {
			throw new BadRequestException(
				`File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`,
			)
		}

		const [, fileExtension] = mimeType.split("/")
		const uniqueFilename = `${randomUUID()}.${fileExtension}`
		const minioObjectKey = `records/${recordId}/${uniqueFilename}`

		// Create document record with UPLOADING status
		const document = await this.prisma.document.create({
			data: {
				recordId,
				userId,
				title: fileName,
				fileName: uniqueFilename,
				originalFileName: fileName,
				mimeType,
				fileSize,
				minioUrl: `${this.minioBaseUrl}/${minioObjectKey}`,
				minioBucket: "medical-documents",
				minioObjectKey,
				status: "UPLOADING",
			},
		})

		// Generate pre-signed upload URL
		const uploadUrl = await this.minio.getPresignedUploadUrl(minioObjectKey)

		this.logger.log(
			`✅ Generated upload URL for document ${document.id} (${(fileSize / 1024 / 1024).toFixed(2)}MB)`,
		)

		return {
			uploadUrl,
			documentId: document.id,
			objectKey: minioObjectKey,
			expiresIn: 300, // 5 minutes
		}
	}

	/**
	 * Подтвердить успешную загрузку файла через pre-signed URL
	 * После подтверждения проверяет готовность всех документов Record к парсингу
	 */
	async confirmUpload(
		documentId: string,
		userId: string,
	): Promise<DocumentResponseDto & { allDocumentsReady: boolean }> {
		const document = await this.prisma.document.findFirst({
			where: {
				id: documentId,
				userId,
				deletedAt: null,
			},
		})

		if (!document) {
			throw new NotFoundException(`Document ${documentId} not found`)
		}

		// Проверяем что файл действительно загружен в MinIO
		const fileExists = await this.minio.fileExists(document.minioObjectKey)

		if (!fileExists) {
			throw new BadRequestException(
				"File not found in storage. Upload may have failed.",
			)
		}

		// Получаем реальный размер файла
		const stats = await this.minio.getFileStats(document.minioObjectKey)

		// Обновляем документ - статус PARSING означает "готов к парсингу"
		const updatedDocument = await this.prisma.document.update({
			where: { id: documentId },
			data: {
				fileSize: stats.size,
				status: "PARSING",
			},
		})

		this.logger.log(
			`✅ Confirmed upload for document ${documentId} (actual size: ${(stats.size / 1024 / 1024).toFixed(2)}MB)`,
		)

		// Проверяем готовность всех документов Record к парсингу
		const allDocumentsReady = await this.checkAndTriggerParsing(
			document.recordId,
			userId,
		)

		return {
			...this.mapToResponseDto(updatedDocument),
			allDocumentsReady,
		}
	}

	/**
	 * Проверяет готовность всех документов Record к парсингу
	 * Если все документы имеют статус PARSING - публикует событие в Redis
	 */
	private async checkAndTriggerParsing(
		recordId: string,
		userId: string,
	): Promise<boolean> {
		// Получаем все документы Record
		const documents = await this.prisma.document.findMany({
			where: {
				recordId,
				deletedAt: null,
			},
			select: {
				id: true,
				status: true,
				minioObjectKey: true,
				mimeType: true,
				originalFileName: true,
			},
		})

		if (documents.length === 0) {
			return false
		}

		// Проверяем что все документы имеют статус PARSING (готовы к обработке)
		const allReady = documents.every((doc) => doc.status === "PARSING")

		this.logger.debug(
			`Record ${recordId}: allReady=${allReady}, statuses=${JSON.stringify(documents.map((d) => d.status))}`,
		)

		if (!allReady) {
			const statusCounts = documents.reduce(
				(acc, doc) => {
					acc[doc.status] = (acc[doc.status] || 0) + 1
					return acc
				},
				{} as Record<string, number>,
			)

			this.logger.log(
				`⏳ Record ${recordId}: not all documents ready. Status: ${JSON.stringify(statusCounts)}`,
			)
			return false
		}

		// Все документы готовы - обновляем статус Record и публикуем событие
		await this.prisma.record.update({
			where: { id: recordId },
			data: { status: "PARSING" },
		})

		const documentIds = documents.map((doc) => doc.id)

		// Публикуем событие для Processing Service (с метаданными документов)
		await this.redis.publishRecordReadyForParsing({
			recordId,
			userId,
			documents: documents.map((doc) => ({
				id: doc.id,
				minioObjectKey: doc.minioObjectKey,
				mimeType: doc.mimeType,
				originalFileName: doc.originalFileName,
			})),
		})

		this.logger.log(
			`🚀 Record ${recordId}: all ${documents.length} documents ready for parsing`,
		)

		return true
	}

	private mapToResponseDto(document: Document): DocumentResponseDto {
		return {
			id: document.id,
			recordId: document.recordId,
			title: document.title,
			description: document.description,
			fileName: document.fileName,
			originalFileName: document.originalFileName,
			mimeType: document.mimeType,
			fileSize: document.fileSize,
			status: document.status,
			errorMessage: document.errorMessage,
			processedAt: document.processedAt,
			failedPhase: document.failedPhase,
			createdAt: document.createdAt,
			updatedAt: document.updatedAt,
		}
	}

	// ========================================================================
	// EVENT HANDLERS (for cross-service communication)
	// ========================================================================

	async updateDocumentStatusFromEvent(
		documentId: string,
		status: string,
		errorMessage?: string,
		failedPhase?: string,
	): Promise<void> {
		try {
			// @ts-ignore - status string to enum cast
			await this.prisma.document.update({
				where: { id: documentId },
				data: {
					status: status as any,
					errorMessage,
					failedPhase,
				},
			})
			this.logger.debug(
				`Updated document ${documentId} status to ${status} from event`,
			)
		} catch (error) {
			this.logger.error(
				`Failed to update document ${documentId} status from event: ${error}`,
			)
		}
	}

	async updateDocumentExtractedContent(
		documentId: string,
		extractedText: string,
		metadata: any,
	): Promise<void> {
		try {
			await this.prisma.document.update({
				where: { id: documentId },
				data: {
					extractedText,
					metadata,
				},
			})
			this.logger.debug(
				`Updated document ${documentId} extracted content from event`,
			)
		} catch (error) {
			this.logger.error(
				`Failed to update document ${documentId} content from event: ${error}`,
			)
		}
	}

	async updateRecordFromAiResult(
		recordId: string,
		tags?: string[],
		title?: string,
		extractedDate?: Date,
		summary?: string,
		description?: string,
		structuredData?: Record<string, any>,
	): Promise<void> {
		try {
			// 1. Update Record fields
			await this.prisma.record.update({
				where: { id: recordId },
				data: {
					status: "COMPLETED",
					...(title && { title }),
					...(extractedDate && { date: extractedDate }),
					...(summary && { summary }),
					...(description && { description }),
					...(structuredData && { structuredData }),
				},
			})

			// 2. Handle Tags if provided
			if (tags && tags.length > 0) {
				// Ensure tags exist
				for (const tagName of tags) {
					await this.prisma.tag.upsert({
						where: { name: tagName },
						update: {},
						create: { name: tagName },
					})
				}

				// Get all tag IDs
				const tagRecords = await this.prisma.tag.findMany({
					where: { name: { in: tags } },
				})

				// Create RecordTag connections
				await this.prisma.recordTag.createMany({
					data: tagRecords.map((tag) => ({
						recordId,
						tagId: tag.id,
					})),
					skipDuplicates: true,
				})
			}

			this.logger.log(`Updated record ${recordId} from AI result event`)
		} catch (error) {
			this.logger.error(
				`Failed to update record ${recordId} from AI result event: ${error}`,
			)
		}
	}

	async handleRetryParsing(recordId: string, userId: string): Promise<void> {
		try {
			// 1. Find failed documents
			const failedDocuments = await this.prisma.document.findMany({
				where: {
					recordId,
					status: "FAILED",
					failedPhase: FailedPhase.PARSING,
				},
			})

			if (failedDocuments.length === 0) {
				this.logger.warn(
					`No failed parsing documents found for retry in record ${recordId}`,
				)
				return
			}

			// 2. Reset status to PARSING
			await this.prisma.document.updateMany({
				where: {
					id: { in: failedDocuments.map((d) => d.id) },
				},
				data: {
					status: "PARSING",
					failedPhase: null,
					errorMessage: null,
				},
			})

			// 3. Publish RECORD_READY_FOR_PARSING
			await this.redis.publishRecordReadyForParsing({
				recordId,
				userId,
				documents: failedDocuments.map((doc) => ({
					id: doc.id,
					minioObjectKey: doc.minioObjectKey,
					mimeType: doc.mimeType,
					originalFileName: doc.originalFileName,
				})),
			})

			this.logger.log(
				`Retrying parsing for ${failedDocuments.length} documents in record ${recordId}`,
			)
		} catch (error) {
			this.logger.error(
				`Failed to handle retry parsing for record ${recordId}: ${error.message}`,
			)
		}
	}

	async handleRetryAi(recordId: string, userId: string): Promise<void> {
		try {
			// 1. Find documents for AI retry: FAILED (processing) or PROCESSING (stuck)
			const documents = await this.prisma.document.findMany({
				where: {
					recordId,
					OR: [
						{
							status: "FAILED",
							failedPhase: FailedPhase.PROCESSING,
						},
						{ status: "PROCESSING" },
					],
				},
			})

			if (documents.length === 0) {
				this.logger.warn(
					`No documents found for AI retry in record ${recordId}`,
				)
				return
			}

			// 2. Reset status to PROCESSING
			await this.prisma.document.updateMany({
				where: {
					id: { in: documents.map((d) => d.id) },
				},
				data: {
					status: "PROCESSING",
					failedPhase: null,
					errorMessage: null,
				},
			})

			// 3. Publish RECORD_READY_FOR_AI
			await this.redis.publish(RedisChannels.RECORD_READY_FOR_AI, {
				recordId,
				userId,
				documentIds: documents.map((d) => d.id),
				timestamp: new Date().toISOString(),
			})

			this.logger.log(
				`Retrying AI processing for ${documents.length} documents in record ${recordId}`,
			)
		} catch (error) {
			this.logger.error(
				`Failed to handle retry AI for record ${recordId}: ${error.message}`,
			)
		}
	}
}
