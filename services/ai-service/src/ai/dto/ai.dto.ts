import { ApiProperty } from "@nestjs/swagger"
import { IsString, IsArray, IsNotEmpty, ArrayMinSize } from "class-validator"

// ============================================================================
// REQUEST DTOs
// ============================================================================

export class EmbeddingRequestDto {
	@ApiProperty({
		description: "Анонимизированный текст для генерации эмбеддинга",
		example: "Пациент [ИМЯ_1] обратился с жалобами на головную боль...",
	})
	@IsString()
	@IsNotEmpty()
	text: string
}

export class EmbeddingsBatchRequestDto {
	@ApiProperty({
		description: "Массив анонимизированных текстов",
		example: ["Текст чанка 1...", "Текст чанка 2..."],
	})
	@IsArray()
	@ArrayMinSize(1)
	@IsString({ each: true })
	texts: string[]
}

export class SummaryRequestDto {
	@ApiProperty({
		description: "Текст документа для генерации саммари (желательно анонимизированный)",
		example: "Анамнез: пациент обратился с жалобами на...",
	})
	@IsString()
	@IsNotEmpty()
	text: string
}

export class AnonymizeRequestDto {
	@ApiProperty({
		description: "Текст для анонимизации",
		example: "Иванов Иван Иванович, проживающий по адресу г. Москва...",
	})
	@IsString()
	@IsNotEmpty()
	text: string
}

export class ProcessChunksRequestDto {
	@ApiProperty({
		description: "Массив текстовых чанков для полной обработки (анонимизация + эмбеддинги)",
		example: ["Чанк 1: текст документа...", "Чанк 2: продолжение..."],
	})
	@IsArray()
	@ArrayMinSize(1)
	@IsString({ each: true })
	chunks: string[]
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

export class PiiMappingDto {
	@ApiProperty({
		description: "Оригинальное значение",
		example: "Иванов Иван Иванович",
	})
	original: string

	@ApiProperty({
		description: "Замена (плейсхолдер)",
		example: "[ИМЯ_1]",
	})
	replacement: string

	@ApiProperty({
		description: "Тип персональных данных",
		enum: ["NAME", "ADDRESS", "PHONE", "EMAIL", "DATE", "ID", "OTHER"],
		example: "NAME",
	})
	type: string
}

export class EmbeddingResponseDto {
	@ApiProperty({
		description: "Векторное представление (768 dimensions для Gemini)",
		example: [0.123, -0.456, 0.789],
		type: [Number],
	})
	embedding: number[]

	@ApiProperty({
		description: "Приблизительное количество использованных токенов",
		example: 150,
	})
	tokensUsed: number
}

export class EmbeddingsBatchResponseDto {
	@ApiProperty({
		description: "Массив эмбеддингов",
		type: [[Number]],
	})
	embeddings: number[][]

	@ApiProperty({
		description: "Общее количество использованных токенов",
		example: 500,
	})
	tokensUsed: number
}

export class SummaryResponseDto {
	@ApiProperty({
		description: "Сгенерированное резюме документа",
		example: "Пациент обратился с жалобами на головную боль. Диагноз: мигрень. Назначено лечение...",
	})
	summary: string

	@ApiProperty({
		description: "Количество использованных токенов",
		example: 250,
	})
	tokensUsed: number
}

export class AnonymizeResponseDto {
	@ApiProperty({
		description: "Анонимизированный текст",
		example: "Пациент [ИМЯ_1], проживающий по адресу [АДРЕС_1]...",
	})
	anonymizedText: string

	@ApiProperty({
		description: "Маппинг оригинальных данных на плейсхолдеры",
		type: [PiiMappingDto],
	})
	piiMappings: PiiMappingDto[]
}

export class ProcessedChunkDto {
	@ApiProperty({
		description: "Анонимизированный текст чанка",
	})
	anonymizedText: string

	@ApiProperty({
		description: "Эмбеддинг (768 dimensions)",
		type: [Number],
	})
	embedding: number[]

	@ApiProperty({
		description: "PII маппинги для этого чанка",
		type: [PiiMappingDto],
	})
	piiMappings: PiiMappingDto[]
}

export class ProcessChunksResponseDto {
	@ApiProperty({
		description: "Обработанные чанки",
		type: [ProcessedChunkDto],
	})
	chunks: ProcessedChunkDto[]

	@ApiProperty({
		description: "Сгенерированное резюме",
	})
	summary: string

	@ApiProperty({
		description: "Сгенерированный заголовок",
	})
	title: string

	@ApiProperty({
		description: "Извлечённые теги",
		type: [String],
	})
	tags: string[]

	@ApiProperty({
		description: "Общее количество использованных токенов",
	})
	tokensUsed: number
}

export class HealthCheckResponseDto {
	@ApiProperty({
		description: "Статус AI сервиса",
		example: "ok",
	})
	status: string

	@ApiProperty({
		description: "Доступность Gemini API",
		example: true,
	})
	geminiAvailable: boolean

	@ApiProperty({
		description: "Доступность Anonymizer сервиса",
		example: true,
	})
	anonymizerAvailable: boolean
}
