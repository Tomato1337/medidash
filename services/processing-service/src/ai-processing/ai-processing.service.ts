import { Injectable, Logger } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { DocumentStatus, PiiType } from "generated/prisma"
import { PrismaService } from "../prisma/prisma.service"
import { EnvService } from "src/env/env.service"

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
	private tonlLoaded = false

	constructor(
		private configService: EnvService,
		private prismaService: PrismaService,
	) {
		this.aiServiceUrl = this.configService.get("AI_SERVICE_URL")
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
	 * Анонимизирует текст чанка
	 * TODO: Реализовать вызов AI Service для реальной анонимизации
	 */
	async anonymizeChunk(content: string): Promise<AnonymizationResult> {
		// TODO: Вызов AI Service /ai/anonymize
		// Пока заглушка — возвращаем оригинальный текст без изменений
		this.logger.warn(
			"🔶 Using mock anonymization - TODO: implement AI Service /ai/anonymize call",
		)

		return {
			anonymizedContent: content,
			piiMappings: [],
		}
	}

	/**
	 * Генерирует эмбеддинг для анонимизированного текста
	 * TODO: Реализовать вызов AI Service для генерации реальных эмбеддингов
	 *
	 * ВАЖНО: Embeddings генерируются на АНОНИМИЗИРОВАННОМ тексте!
	 * TONL НЕ используется для embeddings, только для LLM вызовов (summary)
	 */
	async generateEmbedding(_text: string): Promise<number[]> {
		// TODO: Вызов AI Service /embeddings
		// Пока заглушка — возвращаем нулевой вектор 1536 dimensions (OpenAI format)
		this.logger.warn(
			"🔶 Using mock embeddings - TODO: implement AI Service /embeddings call",
		)

		return Array.from({ length: 1536 }, () => 0)
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
	 * TODO: Реализовать вызов AI Service для генерации реального саммари
	 */
	async generateSummary(
		text: string,
	): Promise<{ summary: string; tokensUsed: number }> {
		const { originalLength, optimizedLength } = this.optimizeWithTONL(text)

		this.logger.debug(
			`Generating summary for ${originalLength} chars (optimized to ${optimizedLength} with TONL)`,
		)

		// TODO: Вызов AI Service /summary
		// Пока заглушка — возвращаем placeholder
		this.logger.warn(
			"🔶 Using mock summary - TODO: implement AI Service /summary call",
		)

		return {
			summary: `[AI Summary placeholder - ${text.length} chars analyzed, ${text.split(/\s+/).length} words]`,
			tokensUsed: 0,
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
		summary: string,
		structuredData?: Record<string, unknown>,
	): Promise<void> {
		await this.prismaService.record.update({
			where: { id: recordId },
			data: {
				summary,
				status: DocumentStatus.COMPLETED, // Также обновляем статус Record
				...(structuredData && { structuredData }),
			},
		})
	}
}
