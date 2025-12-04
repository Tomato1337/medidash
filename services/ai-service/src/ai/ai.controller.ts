import {
	Controller,
	Post,
	Get,
	Body,
	HttpCode,
	HttpStatus,
	Logger,
} from "@nestjs/common"
import {
	ApiTags,
	ApiOperation,
	ApiResponse,
	ApiBadRequestResponse,
	ApiServiceUnavailableResponse,
} from "@nestjs/swagger"
import { AiService } from "./ai.service"
import { AnonymizationService } from "../anonymization/anonymization.service"
import {
	EmbeddingRequestDto,
	EmbeddingsBatchRequestDto,
	SummaryRequestDto,
	AnonymizeRequestDto,
	ProcessChunksRequestDto,
	EmbeddingResponseDto,
	EmbeddingsBatchResponseDto,
	SummaryResponseDto,
	AnonymizeResponseDto,
	ProcessChunksResponseDto,
	HealthCheckResponseDto,
} from "./dto/ai.dto"

@ApiTags("AI")
@Controller("ai")
export class AiController {
	private readonly logger = new Logger(AiController.name)

	constructor(
		private readonly aiService: AiService,
		private readonly anonymizationService: AnonymizationService,
	) {}

	/**
	 * Генерирует эмбеддинг для одного текста
	 */
	@Post("embeddings")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Генерация эмбеддинга",
		description: `
Генерирует векторное представление (embedding) для текста.
Использует модель Gemini text-embedding-004 (768 dimensions).

**ВАЖНО:** Текст должен быть предварительно анонимизирован!
		`,
	})
	@ApiResponse({
		status: 200,
		description: "Эмбеддинг успешно сгенерирован",
		type: EmbeddingResponseDto,
	})
	@ApiBadRequestResponse({ description: "Некорректный запрос" })
	@ApiServiceUnavailableResponse({ description: "Gemini API недоступен" })
	async generateEmbedding(
		@Body() dto: EmbeddingRequestDto,
	): Promise<EmbeddingResponseDto> {
		this.logger.log(`Generating embedding for ${dto.text.length} chars`)
		return this.aiService.generateEmbedding(dto.text)
	}

	/**
	 * Генерирует эмбеддинги для нескольких текстов (batch)
	 */
	@Post("embeddings/batch")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Batch генерация эмбеддингов",
		description: `
Генерирует эмбеддинги для нескольких текстов.
Обрабатывает последовательно с соблюдением rate limit.

**ВАЖНО:** Тексты должны быть предварительно анонимизированы!
		`,
	})
	@ApiResponse({
		status: 200,
		description: "Эмбеддинги успешно сгенерированы",
		type: EmbeddingsBatchResponseDto,
	})
	async generateEmbeddingsBatch(
		@Body() dto: EmbeddingsBatchRequestDto,
	): Promise<EmbeddingsBatchResponseDto> {
		this.logger.log(`Generating embeddings batch for ${dto.texts.length} texts`)

		const results: number[][] = []
		let totalTokens = 0

		for (const text of dto.texts) {
			const { embedding, tokensUsed } =
				await this.aiService.generateEmbedding(text)
			results.push(embedding)
			totalTokens += tokensUsed
		}

		return {
			embeddings: results,
			tokensUsed: totalTokens,
		}
	}

	/**
	 * Генерирует саммари документа
	 */
	@Post("summary")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Генерация резюме документа",
		description: `
Генерирует краткое структурированное резюме медицинского документа.
Использует модель Gemini 2.0 Flash.

Рекомендуется передавать анонимизированный текст.
		`,
	})
	@ApiResponse({
		status: 200,
		description: "Резюме успешно сгенерировано",
		type: SummaryResponseDto,
	})
	async generateSummary(
		@Body() dto: SummaryRequestDto,
	): Promise<SummaryResponseDto> {
		this.logger.log(`Generating summary for ${dto.text.length} chars`)
		return this.aiService.generateSummary(dto.text)
	}

	/**
	 * Анонимизирует текст
	 */
	@Post("anonymize")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Анонимизация текста",
		description: `
Анонимизирует текст, заменяя персональные данные на плейсхолдеры.

Распознаваемые типы PII:
- NAME: ФИО
- ADDRESS: Адреса
- PHONE: Телефоны
- EMAIL: Email адреса
- DATE: Даты рождения
- ID: СНИЛС, паспорт, медицинские ID
- OTHER: Прочие персональные данные

Использует Python сервис с Natasha NER для русского языка.
		`,
	})
	@ApiResponse({
		status: 200,
		description: "Текст успешно анонимизирован",
		type: AnonymizeResponseDto,
	})
	@ApiServiceUnavailableResponse({
		description: "Anonymizer сервис недоступен",
	})
	async anonymize(
		@Body() dto: AnonymizeRequestDto,
	): Promise<AnonymizeResponseDto> {
		this.logger.log(`Anonymizing ${dto.text.length} chars`)
		return this.aiService.anonymize(dto.text)
	}

	/**
	 * Полная обработка чанков документа
	 */
	@Post("process")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Полная обработка документа",
		description: `
Выполняет полный pipeline обработки документа:
1. Анонимизация каждого чанка
2. Генерация эмбеддингов для анонимизированных чанков
3. Генерация общего резюме
4. Генерация заголовка
5. Извлечение тегов

Это основной endpoint для Processing Service.
		`,
	})
	@ApiResponse({
		status: 200,
		description: "Документ успешно обработан",
		type: ProcessChunksResponseDto,
	})
	async processDocument(
		@Body() dto: ProcessChunksRequestDto,
	): Promise<ProcessChunksResponseDto> {
		this.logger.log(`Processing document with ${dto.chunks.length} chunks`)
		return this.aiService.processDocument(dto.chunks)
	}

	/**
	 * Проверка здоровья AI сервисов
	 */
	@Get("health")
	@ApiOperation({
		summary: "Проверка здоровья AI сервисов",
		description: "Проверяет доступность Gemini API и Anonymizer сервиса",
	})
	@ApiResponse({
		status: 200,
		description: "Статус сервисов",
		type: HealthCheckResponseDto,
	})
	async healthCheck(): Promise<HealthCheckResponseDto> {
		const anonymizerAvailable =
			await this.anonymizationService.healthCheck()

		return {
			status: "ok",
			geminiAvailable: true, // Gemini проверяется при старте
			anonymizerAvailable,
		}
	}
}
