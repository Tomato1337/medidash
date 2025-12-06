import { Injectable, Logger, OnModuleInit } from "@nestjs/common"
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai"
import { EnvService } from "../env/env.service"

export interface EmbeddingResult {
	embedding: number[]
	tokensUsed: number
}

export interface SummaryResult {
	summary: string
	tokensUsed: number
}

@Injectable()
export class GeminiService implements OnModuleInit {
	private readonly logger = new Logger(GeminiService.name)
	private genAI: GoogleGenerativeAI
	private embeddingModel: GenerativeModel
	private chatModel: GenerativeModel
	private lastRequestTime = 0
	private rateLimitDelay: number

	constructor(private envService: EnvService) {
		this.rateLimitDelay = this.envService.get("GEMINI_RATE_LIMIT_DELAY_MS")
	}

	async onModuleInit() {
		const apiKey = this.envService.get("GEMINI_API_KEY")
		this.genAI = new GoogleGenerativeAI(apiKey)

		// Модель для эмбеддингов: text-embedding-004 (768 dimensions)
		this.embeddingModel = this.genAI.getGenerativeModel({
			model: "text-embedding-004",
		})

		// Модель для генерации текста (саммари): gemini-2.0-flash
		this.chatModel = this.genAI.getGenerativeModel({
			model: "gemini-2.0-flash",
		})

		this.logger.log("✅ Gemini AI initialized")
		this.logger.log(
			`   Embedding model: text-embedding-004 (768 dimensions)`,
		)
		this.logger.log(`   Chat model: gemini-2.0-flash`)
		this.logger.log(`   Rate limit delay: ${this.rateLimitDelay}ms`)
	}

	/**
	 * Ожидание для соблюдения rate limit
	 */
	private async waitForRateLimit(): Promise<void> {
		const now = Date.now()
		const timeSinceLastRequest = now - this.lastRequestTime
		if (timeSinceLastRequest < this.rateLimitDelay) {
			const waitTime = this.rateLimitDelay - timeSinceLastRequest
			this.logger.debug(`Rate limiting: waiting ${waitTime}ms`)
			await new Promise((resolve) => setTimeout(resolve, waitTime))
		}
		this.lastRequestTime = Date.now()
	}

	/**
	 * Выполняет операцию с retry и exponential backoff
	 */
	private async withRetry<T>(
		operation: () => Promise<T>,
		operationName: string,
		maxRetries = 5,
		baseDelayMs = 2000,
	): Promise<T> {
		let lastError: Error | unknown

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				return await operation()
			} catch (error) {
				lastError = error
				const errorMessage =
					error instanceof Error ? error.message : String(error)

				// Проверяем, является ли ошибка временной (сетевая ошибка)
				const isRetryable =
					errorMessage.includes("fetch failed") ||
					errorMessage.includes("ECONNRESET") ||
					errorMessage.includes("ETIMEDOUT") ||
					errorMessage.includes("ENOTFOUND") ||
					errorMessage.includes("socket hang up") ||
					errorMessage.includes("network") ||
					errorMessage.includes("terminated") ||
					errorMessage.includes("other side closed") ||
					errorMessage.includes("UND_ERR_SOCKET") ||
					errorMessage.includes("503") ||
					errorMessage.includes("429")

				if (!isRetryable || attempt === maxRetries) {
					this.logger.error(
						`${operationName} failed after ${attempt} attempt(s): ${errorMessage}`,
					)
					throw error
				}

				const delayMs = baseDelayMs * Math.pow(2, attempt - 1)
				this.logger.warn(
					`${operationName} failed (attempt ${attempt}/${maxRetries}): ${errorMessage}. Retrying in ${delayMs}ms...`,
				)
				await new Promise((resolve) => setTimeout(resolve, delayMs))
			}
		}

		throw lastError
	}

	/**
	 * Генерирует эмбеддинг для текста
	 * Использует text-embedding-004 (768 dimensions)
	 *
	 * ВАЖНО: Текст должен быть уже анонимизирован!
	 */
	async generateEmbedding(text: string): Promise<EmbeddingResult> {
		await this.waitForRateLimit()

		return this.withRetry(
			async () => {
				const result = await this.embeddingModel.embedContent(text)
				const embedding = result.embedding.values

				this.logger.debug(
					`Generated embedding: ${embedding.length} dimensions for ${text.length} chars`,
				)

				return {
					embedding,
					// Gemini не возвращает tokens напрямую, примерная оценка
					tokensUsed: Math.ceil(text.length / 4),
				}
			},
			"generateEmbedding",
			3,
			1000,
		)
	}

	/**
	 * Генерирует эмбеддинги для нескольких текстов (batch)
	 * Обрабатывает последовательно с соблюдением rate limit
	 */
	async generateEmbeddings(
		texts: string[],
	): Promise<{ embeddings: number[][]; tokensUsed: number }> {
		const embeddings: number[][] = []
		let totalTokens = 0

		for (const text of texts) {
			const result = await this.generateEmbedding(text)
			embeddings.push(result.embedding)
			totalTokens += result.tokensUsed
		}

		this.logger.log(
			`Generated ${embeddings.length} embeddings, ~${totalTokens} tokens`,
		)

		return { embeddings, tokensUsed: totalTokens }
	}

	/**
	 * Генерирует саммари для медицинского документа
	 * Использует TONL-оптимизированный текст для экономии токенов
	 */
	async generateSummary(text: string): Promise<SummaryResult> {
		await this.waitForRateLimit()

		const prompt = `Ты — медицинский ассистент. Проанализируй следующий медицинский документ и создай краткое структурированное резюме на русском языке.

Включи:
- Основной диагноз или причина обращения
- Ключевые результаты обследований/анализов
- Назначенное лечение или рекомендации
- Важные предупреждения или противопоказания (если есть)

Формат: краткий абзац (2-4 предложения).

Документ:
${text}

Резюме:`

		return this.withRetry(
			async () => {
				const result = await this.chatModel.generateContent(prompt)
				const response = result.response
				const summary = response.text()

				// Получаем информацию о токенах
				const usageMetadata = response.usageMetadata
				const tokensUsed =
					(usageMetadata?.promptTokenCount || 0) +
					(usageMetadata?.candidatesTokenCount || 0)

				this.logger.debug(
					`Generated summary: ${summary.length} chars, ${tokensUsed} tokens`,
				)

				return {
					summary: summary.trim(),
					tokensUsed,
				}
			},
			"generateSummary",
			3,
			1000,
		)
	}

	/**
	 * Генерирует заголовок для документа на основе его содержимого
	 */
	async generateTitle(text: string): Promise<string> {
		await this.waitForRateLimit()

		const prompt = `Создай короткий заголовок (3-7 слов) для этого медицинского документа на русском языке.
Только заголовок, без кавычек и пояснений.

Документ:
${text.slice(0, 1000)}

Заголовок:`

		return this.withRetry(
			async () => {
				const result = await this.chatModel.generateContent(prompt)
				const title = result.response.text().trim()

				this.logger.debug(`Generated title: ${title}`)

				return title
			},
			"generateTitle",
			3,
			1000,
		)
	}

	/**
	 * Извлекает теги из медицинского документа
	 */
	async extractTags(text: string): Promise<string[]> {
		await this.waitForRateLimit()

		const prompt = `Извлеки 3-5 ключевых тегов из этого медицинского документа.
Теги должны быть на русском языке, в нижнем регистре.
Верни только теги через запятую, без нумерации.

Примеры тегов: анализ крови, узи, кардиология, терапевт, рецепт

Документ:
${text.slice(0, 2000)}

Теги:`

		return this.withRetry(
			async () => {
				const result = await this.chatModel.generateContent(prompt)
				const tagsText = result.response.text().trim()
				const tags = tagsText
					.split(",")
					.map((tag) => tag.trim().toLowerCase())
					.filter((tag) => tag.length > 0 && tag.length < 50)

				this.logger.debug(`Extracted tags: ${tags.join(", ")}`)

				return tags
			},
			"extractTags",
			3,
			1000,
		)
	}
}
