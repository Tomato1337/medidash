import { Injectable, Logger } from "@nestjs/common"
import { GeminiService } from "../gemini/gemini.service"
import {
	AnonymizationService,
	PiiMapping,
} from "../anonymization/anonymization.service"

export interface ProcessChunkResult {
	anonymizedText: string
	embedding: number[]
	piiMappings: PiiMapping[]
}

export interface ProcessDocumentResult {
	chunks: ProcessChunkResult[]
	summary: string
	title: string
	tags: string[]
	tokensUsed: number
}

@Injectable()
export class AiService {
	private readonly logger = new Logger(AiService.name)

	constructor(
		private geminiService: GeminiService,
		private anonymizationService: AnonymizationService,
	) {}

	/**
	 * Обрабатывает один чанк: анонимизация → эмбеддинг
	 */
	async processChunk(text: string): Promise<ProcessChunkResult> {
		// 1. Анонимизация
		const { anonymizedText, piiMappings } =
			await this.anonymizationService.anonymize(text)

		// 2. Генерация эмбеддинга на анонимизированном тексте
		const { embedding } =
			await this.geminiService.generateEmbedding(anonymizedText)

		return {
			anonymizedText,
			embedding,
			piiMappings,
		}
	}

	/**
	 * Обрабатывает несколько чанков последовательно
	 */
	async processChunks(texts: string[]): Promise<ProcessChunkResult[]> {
		const results: ProcessChunkResult[] = []

		for (const text of texts) {
			const result = await this.processChunk(text)
			results.push(result)
		}

		this.logger.log(`Processed ${results.length} chunks`)
		return results
	}

	/**
	 * Генерирует эмбеддинг для уже анонимизированного текста
	 */
	async generateEmbedding(anonymizedText: string): Promise<{
		embedding: number[]
		tokensUsed: number
	}> {
		return this.geminiService.generateEmbedding(anonymizedText)
	}

	/**
	 * Генерирует саммари документа
	 */
	async generateSummary(text: string): Promise<{
		summary: string
		tokensUsed: number
	}> {
		return this.geminiService.generateSummary(text)
	}

	/**
	 * Анонимизирует текст
	 */
	async anonymize(text: string): Promise<{
		anonymizedText: string
		piiMappings: PiiMapping[]
	}> {
		return this.anonymizationService.anonymize(text)
	}

	/**
	 * Полная обработка документа: анонимизация всех чанков, эмбеддинги, саммари
	 */
	async processDocument(chunks: string[]): Promise<ProcessDocumentResult> {
		let totalTokens = 0

		// 1. Обрабатываем все чанки (анонимизация + эмбеддинги)
		const processedChunks = await this.processChunks(chunks)

		// 2. Собираем анонимизированный текст для саммари
		const allAnonymizedText = processedChunks
			.map((c) => c.anonymizedText)
			.join("\n\n")

		// 3. Генерируем саммари
		const { summary, tokensUsed: summaryTokens } =
			await this.geminiService.generateSummary(allAnonymizedText)
		totalTokens += summaryTokens

		// 4. Генерируем заголовок
		const title = await this.geminiService.generateTitle(allAnonymizedText)

		// 5. Извлекаем теги
		const tags = await this.geminiService.extractTags(allAnonymizedText)

		this.logger.log(
			`Document processed: ${processedChunks.length} chunks, ${summary.length} chars summary`,
		)

		return {
			chunks: processedChunks,
			summary,
			title,
			tags,
			tokensUsed: totalTokens,
		}
	}

	/**
	 * OCR для изображений
	 */
	async extractTextFromImage(
		imageBuffer: Buffer,
		mimeType: string,
	): Promise<{ text: string; confidence: number }> {
		const result = await this.anonymizationService.ocr(
			imageBuffer,
			mimeType,
		)
		return {
			text: result.text,
			confidence: result.confidence,
		}
	}
}
