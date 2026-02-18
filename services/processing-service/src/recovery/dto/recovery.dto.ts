import { IsString, IsIn } from "class-validator"
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import {
	FailedPhase,
	type FailedPhaseValues,
	DocumentStatus,
	type DocumentStatusValues,
} from "@shared-types"

// ============ Request DTOs ============

export class RetryProcessingParamsDto {
	@ApiProperty({
		description: "ID записи (Record)",
		example: "clx1234567890",
	})
	@IsString()
	recordId: string

	@ApiProperty({
		description: "Фаза обработки для перезапуска",
		enum: [FailedPhase.PARSING, FailedPhase.PROCESSING],
		example: FailedPhase.PARSING,
	})
	@IsString()
	@IsIn([FailedPhase.PARSING, FailedPhase.PROCESSING])
	phase: FailedPhaseValues
}

export class RecordIdParamDto {
	@ApiProperty({
		description: "ID записи (Record)",
		example: "clx1234567890",
	})
	@IsString()
	recordId: string
}

// ============ Response DTOs ============

export class RecoveryResponseDto {
	@ApiProperty({
		description: "Успешность операции",
		example: true,
	})
	success: boolean

	@ApiProperty({
		description: "ID записи",
		example: "clx1234567890",
	})
	recordId: string

	@ApiProperty({
		description: "Фаза обработки",
		enum: [FailedPhase.PARSING, FailedPhase.PROCESSING],
		example: FailedPhase.PARSING,
	})
	phase: FailedPhaseValues

	@ApiProperty({
		description: "Количество документов в обработке",
		example: 3,
	})
	documentsCount: number

	@ApiProperty({
		description: "Сообщение о результате операции",
		example: "Started parsing recovery for 3 documents",
	})
	message: string
}

export class DocumentStatusDto {
	@ApiProperty({
		description: "ID документа",
		example: "doc_123456",
	})
	id: string

	@ApiProperty({
		description: "Статус документа",
		enum: ["UPLOADING", "PARSING", "PROCESSING", "COMPLETED", "FAILED"],
		example: "PROCESSING",
	})
	status: DocumentStatusValues

	@ApiPropertyOptional({
		description: "Фаза, на которой произошла ошибка",
		enum: [FailedPhase.PARSING, FailedPhase.PROCESSING],
		example: FailedPhase.PARSING,
		nullable: true,
	})
	failedPhase: string | null
}

export class QueueStatsDto {
	@ApiProperty({
		description: "Количество задач в ожидании",
		example: 5,
	})
	waiting: number

	@ApiProperty({
		description: "Количество активных задач",
		example: 2,
	})
	active: number

	@ApiProperty({
		description: "Количество неудачных задач",
		example: 1,
	})
	failed: number
}

export class ProcessingStatusResponseDto {
	@ApiProperty({
		description: "ID записи",
		example: "clx1234567890",
	})
	recordId: string

	@ApiProperty({
		description: "Общий статус обработки записи",
		enum: ["UPLOADING", "PARSING", "PROCESSING", "COMPLETED", "FAILED"],
		example: "PROCESSING",
	})
	status: string

	@ApiProperty({
		description: "Список документов записи",
		type: [DocumentStatusDto],
	})
	documents: DocumentStatusDto[]

	@ApiProperty({
		description: "Статистика очереди парсинга",
		type: QueueStatsDto,
	})
	parsingQueueStats: QueueStatsDto

	@ApiProperty({
		description: "Статистика очереди AI обработки",
		type: QueueStatsDto,
	})
	aiQueueStats: QueueStatsDto
}

export class ConnectionsStatusDto {
	@ApiProperty({
		description: "Статус подключения к Redis",
		example: "connected",
	})
	redis: string

	@ApiProperty({
		description: "Статус подключения к базе данных",
		example: "connected",
	})
	database: string

	@ApiProperty({
		description: "Статус очереди парсинга",
		example: "ready",
	})
	parsingQueue: string

	@ApiProperty({
		description: "Статус очереди AI обработки",
		example: "ready",
	})
	aiProcessingQueue: string
}

export class HealthCheckResponseDto {
	@ApiProperty({
		description: "Статус сервиса",
		example: "ok",
	})
	status: string

	@ApiProperty({
		description: "Название сервиса",
		example: "processing-service",
	})
	service: string

	@ApiProperty({
		description: "Время работы сервиса (секунды)",
		example: 12345.67,
	})
	uptime: number

	@ApiProperty({
		description: "Временная метка проверки",
		example: "2025-12-03T12:00:00.000Z",
	})
	timestamp: string

	@ApiProperty({
		description: "Статус подключений",
		type: ConnectionsStatusDto,
	})
	connections: ConnectionsStatusDto
}

export class QueueHealthDto {
	@ApiProperty({
		description: "Название очереди",
		example: "parsing-queue",
	})
	name: string

	@ApiProperty({
		description: "Статус очереди",
		example: "ready",
	})
	status: string

	@ApiProperty({
		description: "Статистика очереди",
		type: QueueStatsDto,
	})
	stats: QueueStatsDto
}

export class QueuesStatusResponseDto {
	@ApiProperty({
		description: "Информация об очереди парсинга",
		type: QueueHealthDto,
	})
	parsing: QueueHealthDto

	@ApiProperty({
		description: "Информация об очереди AI обработки",
		type: QueueHealthDto,
	})
	aiProcessing: QueueHealthDto
}
