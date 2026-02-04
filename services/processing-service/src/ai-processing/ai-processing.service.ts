import { Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common"
import { DocumentStatus, PiiType } from "generated/prisma"
import { PrismaService } from "../prisma/prisma.service"
import { EnvService } from "src/env/env.service"
import axios, { AxiosInstance } from "axios"

// Динамический импорт для ESM модуля tonl
let encodeTONL: (text: string) => string

async function loadTonl() {
	const tonl = await import("tonl")
	encodeTONL = tonl.encodeTONL
}

// Загружаем модуль при старте
loadTonl().catch((err) => {
	console.error("Failed to load tonl module:", err)
})

export interface AiProcessingResult {
	summary: string
	structuredData: Record<string, unknown>
	embeddings: number[][]
	tokensUsed: number
	tokensSaved: number
}

/**
 * Чанк для обработки, получаемый из DocumentChunk таблицы
 */
export interface ChunkForProcessing {
	id: string // ID записи DocumentChunk
	content: string
	order: number
	documentId: string
	userId: string
}

/**
 * Результат анонимизации чанка
 */
export interface AnonymizationResult {
	anonymizedContent: string
	piiMappings: Array<{
		original: string
		replacement: string
		type: PiiType
	}>
}

/**
 * Обработанный чанк с анонимизированным контентом и эмбеддингом
 */
export interface ProcessedChunk {
	id: string
	documentId: string
	userId: string
	anonymizedContent: string
	embedding: number[]
	piiMappings: AnonymizationResult["piiMappings"]
}

@Injectable()
export class AiProcessingService {
	private readonly logger = new Logger(AiProcessingService.name)
	private readonly aiServiceUrl: string
	private readonly httpClient: AxiosInstance
	private tonlLoaded = false

	constructor(
		private configService: EnvService,
		private prismaService: PrismaService,
	) {
		this.aiServiceUrl = this.configService.get("AI_SERVICE_URL")

		// Создаём HTTP клиент для AI Service
		this.httpClient = axios.create({
			baseURL: this.aiServiceUrl,
			timeout: 60000, // 60 секунд для AI операций
			headers: {
				"Content-Type": "application/json",
			},
		})

		this.logger.log(`✅ AI Service configured: ${this.aiServiceUrl}`)
		this.initTonl()
	}

	private async initTonl() {
		try {
			const tonl = await import("tonl")
			encodeTONL = tonl.encodeTONL
			this.tonlLoaded = true
			this.logger.log("TONL module loaded successfully")
		} catch (err) {
			this.logger.error("Failed to load TONL module", err)
		}
	}

	/**
	 * Оптимизирует текст с помощью TONL для экономии токенов
	 * Экономия 32-45% на LLM запросах
	 */
	optimizeWithTONL(text: string): {
		optimized: string
		originalLength: number
		optimizedLength: number
	} {
		const originalLength = text.length

		// Если TONL не загружен, возвращаем оригинальный текст
		if (!encodeTONL) {
			this.logger.warn("TONL not loaded, returning original text")
			return {
				optimized: text,
				originalLength,
				optimizedLength: originalLength,
			}
		}

		const optimized = encodeTONL(text)
		const optimizedLength = optimized.length

		const savings = (
			((originalLength - optimizedLength) / originalLength) *
			100
		).toFixed(1)
		this.logger.debug(
			`TONL optimization: ${originalLength} → ${optimizedLength} chars (${savings}% saved)`,
		)

		return { optimized, originalLength, optimizedLength }
	}

	/**
	 * Получает чанки из таблицы DocumentChunk для обработки
	 * Чанки уже созданы на этапе парсинга
	 */
	async getChunksFromDatabase(
		documentIds: string[],
	): Promise<ChunkForProcessing[]> {
		const chunks = await this.prismaService.documentChunk.findMany({
			where: {
				documentId: { in: documentIds },
			},
			orderBy: [{ documentId: "asc" }, { order: "asc" }],
			select: {
				id: true,
				content: true,
				order: true,
				documentId: true,
				userId: true,
			},
		})

		this.logger.debug(
			`Loaded ${chunks.length} chunks from DocumentChunk table for ${documentIds.length} documents`,
		)

		return chunks
	}

	/**
	 * Анонимизирует текст чанка через AI Service
	 */
	async anonymizeChunk(content: string): Promise<AnonymizationResult> {
		try {
			const response = await this.httpClient.post<{
				anonymizedText: string
				piiMappings: Array<{
					original: string
					replacement: string
					type: string
				}>
			}>("/api/ai/anonymize", { text: content })

			this.logger.debug(
				`Anonymized chunk: ${response.data.piiMappings.length} PII items found`,
			)

			return {
				anonymizedContent: response.data.anonymizedText,
				piiMappings: response.data.piiMappings.map((pii) => ({
					original: pii.original,
					replacement: pii.replacement,
					type: pii.type as PiiType,
				})),
			}
		} catch (error) {
			if (axios.isAxiosError(error)) {
				this.logger.error(
					`Anonymization failed: ${error.response?.data?.message || error.message}`,
				)
				throw new HttpException(
					`AI Service anonymization error: ${error.response?.data?.message || error.message}`,
					error.response?.status || HttpStatus.SERVICE_UNAVAILABLE,
				)
			}
			throw error
		}
	}

	/**
	 * Генерирует эмбеддинг для анонимизированного текста через AI Service
	 *
	 * ВАЖНО: Embeddings генерируются на АНОНИМИЗИРОВАННОМ тексте!
	 * TONL НЕ используется для embeddings, только для LLM вызовов (summary)
	 * Gemini text-embedding-004 возвращает 768-dimensional вектор
	 */
	async generateEmbedding(text: string): Promise<number[]> {
		try {
			const response = await this.httpClient.post<{
				embedding: number[]
				tokensUsed: number
			}>("/api/ai/embeddings", { text })

			this.logger.debug(
				`Generated embedding: ${response.data.embedding.length} dimensions`,
			)

			return response.data.embedding
		} catch (error) {
			if (axios.isAxiosError(error)) {
				this.logger.error(
					`Embedding generation failed: ${error.response?.data?.message || error.message}`,
				)
				throw new HttpException(
					`AI Service embedding error: ${error.response?.data?.message || error.message}`,
					error.response?.status || HttpStatus.SERVICE_UNAVAILABLE,
				)
			}
			throw error
		}
	}

	/**
	 * Обрабатывает все чанки: анонимизация + генерация эмбеддингов
	 * Это основной метод для AI обработки
	 */
	async processChunks(
		chunks: ChunkForProcessing[],
	): Promise<ProcessedChunk[]> {
		const processedChunks: ProcessedChunk[] = []

		for (const chunk of chunks) {
			// 1. Анонимизируем текст
			const { anonymizedContent, piiMappings } =
				await this.anonymizeChunk(chunk.content)
			this.prismaService.documentChunk.update({
				data: {
					content: anonymizedContent,
				},
				where: {
					id: chunk.id,
				},
			})
			// 2. Генерируем эмбеддинг на анонимизированном тексте
			const embedding = await this.generateEmbedding(anonymizedContent)

			processedChunks.push({
				id: chunk.id,
				documentId: chunk.documentId,
				userId: chunk.userId,
				anonymizedContent,
				embedding,
				piiMappings,
			})
		}

		this.logger.log(
			`✅ Processed ${processedChunks.length} chunks (anonymization + embeddings)`,
		)

		return processedChunks
	}

	/**
	 * @deprecated Use generateEmbedding instead
	 * Отправляет запрос в AI Service для генерации эмбеддингов (batch)
	 */
	async generateEmbeddings(chunks: ChunkForProcessing[]): Promise<{
		embeddings: number[][]
		tokensUsed: number
		tokensSaved: number
	}> {
		// Заглушка — используем новый метод
		this.logger.warn(
			"generateEmbeddings is deprecated, use processChunks instead",
		)

		const embeddings: number[][] = []
		for (const chunk of chunks) {
			const embedding = await this.generateEmbedding(chunk.content)
			embeddings.push(embedding)
		}

		return {
			embeddings,
			tokensUsed: 0,
			tokensSaved: 0,
		}
	}

	/**
	 * Генерирует саммари документа через AI Service
	 * TONL используется здесь для экономии токенов (это LLM вызов)
	 */
	async generateSummary(text: string): Promise<{
		title: string
		summary: string
		report: string
		tags: Array<{
			name: string
			description: string
			color: string
			isSystem: boolean
		}>
		tokensUsed: number
	}> {
		const { optimized, originalLength, optimizedLength } =
			this.optimizeWithTONL(text)

		this.logger.debug(
			`Generating summary for ${originalLength} chars (optimized to ${optimizedLength} with TONL)`,
		)

		try {
			const response = await this.httpClient.post<{
				title: string
				summary: string
				report: string
				tags: Array<{
					name: string
					description: string
					color: string
					isSystem: boolean
				}>
				tokensUsed: number
			}>("/api/ai/summary", { text: optimized })

			this.logger.debug(
				`Generated summary: ${response.data.summary.length} chars, ${response.data.tokensUsed} tokens`,
			)

			return {
				title: response.data.title,
				summary: response.data.summary,
				report: response.data.report,
				tags: response.data.tags,
				tokensUsed: response.data.tokensUsed,
			}
		} catch (error) {
			if (axios.isAxiosError(error)) {
				this.logger.error(
					`Summary generation failed: ${error.response?.data?.message || error.message}`,
				)
				throw new HttpException(
					`AI Service summary error: ${error.response?.data?.message || error.message}`,
					error.response?.status || HttpStatus.SERVICE_UNAVAILABLE,
				)
			}
			throw error
		}
	}

	/**
	 * Сохраняет обработанные чанки в базу данных
	 * - Обновляет DocumentChunk: content (анонимизированный) + embedding
	 * - Создаёт записи PiiMapping для деанонимизации
	 */
	async saveProcessedChunks(
		processedChunks: ProcessedChunk[],
	): Promise<void> {
		for (const chunk of processedChunks) {
			// Конвертируем embedding массив в формат pgvector: [0,0,0,...]
			const embeddingStr = `[${chunk.embedding.join(",")}]`

			// Обновляем DocumentChunk с анонимизированным контентом и эмбеддингом
			// Используем raw SQL для pgvector
			await this.prismaService.$executeRaw`
				UPDATE "DocumentChunk" 
				SET 
					content = ${chunk.anonymizedContent},
					embedding = ${embeddingStr}::vector,
					"updatedAt" = NOW()
				WHERE id = ${chunk.id}
			`

			// Сохраняем PII маппинги для возможности деанонимизации
			// TODO: Добавить шифрование original значений (AES)
			if (chunk.piiMappings.length > 0) {
				await this.prismaService.piiMapping.createMany({
					data: chunk.piiMappings.map((pii) => ({
						documentId: chunk.documentId,
						userId: chunk.userId,
						original: pii.original, // TODO: encrypt with AES
						replacement: pii.replacement,
						type: pii.type,
						// encryptionIv: null, // TODO: add when encryption implemented
					})),
				})
			}
		}

		this.logger.debug(
			`Saved ${processedChunks.length} processed chunks to DocumentChunk table`,
		)
	}

	/**
	 * Обновляет статус документа
	 */
	async updateDocumentStatus(
		documentId: string,
		status: DocumentStatus,
		error?: string,
		failedPhase?: string,
	): Promise<void> {
		await this.prismaService.document.update({
			where: { id: documentId },
			data: {
				status,
				...(error && { errorMessage: error }),
				...(failedPhase && { failedPhase }),
			},
		})
	}

	/**
	 * Обновляет статус всех документов Record
	 */
	async updateRecordDocumentsStatus(
		documentIds: string[],
		status: DocumentStatus,
	): Promise<void> {
		await this.prismaService.document.updateMany({
			where: { id: { in: documentIds } },
			data: { status },
		})
	}

	/**
	 * Обновляет Record с результатами AI обработки
	 */
	async updateRecordWithAiResults(
		recordId: string,
		title: string,
		summary: string,
		report: string,
		structuredData?: Record<string, unknown>,
	): Promise<void> {
		const record = await this.prismaService.record.findUnique({
			where: { id: recordId },
		})
		console.log(title)
		const isChangingTitle = record?.title === ""
		await this.prismaService.record.update({
			where: { id: recordId },
			data: {
				title: isChangingTitle ? title : record?.title,
				summary,
				description: report,
				status: DocumentStatus.COMPLETED, // Также обновляем статус Record
				...(structuredData && { structuredData }),
			},
		})
	}

	/**
	 * Сохраняет теги для Record
	 * Если тег с таким именем существует — connect, иначе create + connect
	 */
	async saveTagsForRecord(
		recordId: string,
		tags: Array<{
			name: string
			description: string
			color: string
			isSystem: boolean
		}>,
	): Promise<void> {
		for (const tag of tags) {
			// Проверяем, существует ли тег с таким именем
			const existingTag = await this.prismaService.tag.findUnique({
				where: { name: tag.name },
			})

			if (existingTag) {
				// Тег существует — создаём только связь (если она ещё не существует)
				await this.prismaService.recordTag.upsert({
					where: {
						recordId_tagId: {
							recordId,
							tagId: existingTag.id,
						},
					},
					create: {
						recordId,
						tagId: existingTag.id,
					},
					update: {}, // Ничего не обновляем, связь уже есть
				})

				this.logger.debug(
					`Connected existing tag "${tag.name}" to record ${recordId}`,
				)
			} else {
				// Тег не существует — создаём новый тег и связь
				const newTag = await this.prismaService.tag.create({
					data: {
						name: tag.name,
						description: tag.description,
						color: tag.color,
						isSystem: tag.isSystem,
					},
				})

				await this.prismaService.recordTag.create({
					data: {
						recordId,
						tagId: newTag.id,
					},
				})

				this.logger.debug(
					`Created new tag "${tag.name}" and connected to record ${recordId}`,
				)
			}
		}

		this.logger.log(`✅ Saved ${tags.length} tags for record ${recordId}`)
	}
}
