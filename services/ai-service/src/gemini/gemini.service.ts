import { Injectable, Logger, OnModuleInit } from "@nestjs/common"
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai"
import { EnvService } from "../env/env.service"
import z from "zod"

export interface EmbeddingResult {
	embedding: number[]
	tokensUsed: number
}

export interface SummaryResult {
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

		// Модель для эмбеддингов: gemini-embedding-001
		// По умолчанию 768 измерений для gemini-embedding-001 (или настраивается через outputDimensionality)
		this.embeddingModel = this.genAI.getGenerativeModel({
			model: "gemini-embedding-001",
		})

		// Модель для генерации текста (саммари): gemini-2.5-flash
		this.chatModel = this.genAI.getGenerativeModel({
			model: "gemini-2.5-flash",
			generationConfig: {
				responseMimeType: "application/json",
			},
		})

		this.logger.log("✅ Gemini AI initialized")
		this.logger.log(
			`   Embedding model: gemini-embedding-001 (configured for 768 dimensions)`,
		)
		this.logger.log(`   Chat model: gemini-2.5-flash`)
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
	 * Extracts retry delay from Google API error message
	 * Looks for patterns like "Please retry in 13.577738437s" or "retryDelay":"16s"
	 */
	private extractRetryDelay(errorMessage: string): number | null {
		// Pattern 1: "Please retry in 13.577738437s"
		const retryInMatch = errorMessage.match(/retry in (\d+(?:\.\d+)?)\s*s/i)
		if (retryInMatch) {
			return Math.ceil(parseFloat(retryInMatch[1]) * 1000)
		}

		// Pattern 2: "retryDelay":"16s"
		const retryDelayMatch = errorMessage.match(
			/"retryDelay"\s*:\s*"(\d+)s"/,
		)
		if (retryDelayMatch) {
			return parseInt(retryDelayMatch[1], 10) * 1000
		}

		return null
	}

	/**
	 * Выполняет операцию с retry и exponential backoff
	 * Для ошибок 429 использует retryDelay из ответа API
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

				// Check if error is 429 (rate limit)
				const is429 = errorMessage.includes("429")

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
					is429

				if (!isRetryable || attempt === maxRetries) {
					this.logger.error(
						`${operationName} failed after ${attempt} attempt(s): ${errorMessage}`,
					)
					throw error
				}

				// For 429 errors, try to extract the recommended retry delay from API response
				let delayMs: number
				if (is429) {
					const apiDelay = this.extractRetryDelay(errorMessage)
					if (apiDelay) {
						// Add 1 second buffer to the API-recommended delay
						delayMs = apiDelay + 1000
						this.logger.warn(
							`${operationName} rate limited (attempt ${attempt}/${maxRetries}). API suggests ${apiDelay}ms, waiting ${delayMs}ms...`,
						)
					} else {
						// Fallback to longer delay for 429 errors
						delayMs = Math.min(
							30000,
							baseDelayMs * Math.pow(2, attempt),
						)
						this.logger.warn(
							`${operationName} rate limited (attempt ${attempt}/${maxRetries}). Using fallback delay ${delayMs}ms...`,
						)
					}
				} else {
					// Standard exponential backoff for other errors
					delayMs = baseDelayMs * Math.pow(2, attempt - 1)
					this.logger.warn(
						`${operationName} failed (attempt ${attempt}/${maxRetries}): ${errorMessage}. Retrying in ${delayMs}ms...`,
					)
				}

				await new Promise((resolve) => setTimeout(resolve, delayMs))
			}
		}

		throw lastError
	}

	/**
	 * Генерирует эмбеддинг для текста
	 * Использует gemini-embedding-001 с outputDimensionality: 768
	 *
	 * ВАЖНО: Текст должен быть уже анонимизирован!
	 */
	async generateEmbedding(text: string): Promise<EmbeddingResult> {
		await this.waitForRateLimit()

		return this.withRetry(
			async () => {
				const result = await this.embeddingModel.embedContent({
					content: { role: "user", parts: [{ text }] },
					outputDimensionality: 768,
				} as any)
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

		const prompt = `Ты — медицинский ассистент. Проанализируй следующий медицинский документ, создай краткое структурированное резюме на русском языке и подробный отчёт о предоставленных документах со всеми сведениями. Также нужно выбрать подходящие тэги из <tags/> или добавь новые в формате format.tags. Также удали из ответа анонимизированные значения в виде [NAME], [ADDRESS], [PHONE], [EMAIL], [DATE], [ID], [OTHER]. НИКОГДА НЕ УПОМИНАЙ И ПРОПУСКАЙ ВСЁ, ЧТО СВЯЗАНО С ЛИЧНЫМИ ДАННЫМИ, ТОЛЬКО ФАКТЫ О ПАЦИЕНТЕ БЕЗ ЕГО ЛИЧНОЙ ИНФОРМАЦИИ, КЛИНИКИ И ПРОЧЕГО. ВСЕГДА ВОЗВРАЩАЙ ОТВЕТ В ВИДЕ format.your_response_with_json_format

Включи:
- Основной диагноз или причина обращения
- Ключевые результаты обследований/анализов
- Назначенное лечение или рекомендации
- Важные предупреждения или противопоказания (если есть)

<tags>
Анализы, Заключения, Рецепты, МРТ, УЗИ, Рентген, КТ, ЭКГ, Прививки, Кардиология, Неврология, Эндокринология, Онкология, Терапия, Выписки, Направления, Справки, Стоматология, Офтальмология, ЛОР, Гинекология, Урология, Хирургия, Травматология, Дерматология, Гастроэнтерология
</tags>
<document>
        ${text}
</document>

<format>
        <title>
            Краткий заголовок для резюме (1-2 предложения).
        </title>
        <resume>
            Краткий абзац для резюме (2-4 предложения).
        </resume>
        <report>
            Подробный отчёт о предоставленных документах со всеми сведениями.
        </report>
        <tags>
            [
                {
                    "name": "Название тэга",
                    "description": "Описание тэга",
                    "color": "Цвет",
                    "isSystem": true
                }
            ]
        </tags>
        <your_response_with_json_format>
            {
                "title": format.title,
                "resume": format.resume,
                "report": format.report,
                "tags": format.tags
            }
        </your_response_with_json_format>
</format>
`

		return this.withRetry(
			async () => {
				const responseSchema = z.object({
					title: z.string(),
					resume: z.string(),
					report: z.string(),
					tags: z.array(
						z.object({
							name: z.string(),
							description: z.string(),
							color: z.string(),
							isSystem: z.boolean(),
						}),
					),
				})

				const result = await this.chatModel.generateContent(prompt)
				const response = result.response
				const responseRawObject = response.text()

				const safeObject = responseSchema.parse(
					JSON.parse(responseRawObject),
				)

				const title = safeObject.title
				const summary = safeObject.resume
				const report = safeObject.report
				const tags = safeObject.tags

				// Получаем информацию о токенах
				const usageMetadata = response.usageMetadata
				const tokensUsed =
					(usageMetadata?.promptTokenCount || 0) +
					(usageMetadata?.candidatesTokenCount || 0)

				this.logger.debug(
					`Generated summary: ${summary.length} chars, ${tokensUsed} tokens`,
				)

				return {
					title: title.trim(),
					summary: summary.trim(),
					report: report.trim(),
					tags,
					tokensUsed,
				}
			},
			"generateSummary",
			3,
			1000,
		)
	}
}
