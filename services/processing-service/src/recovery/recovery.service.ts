import { Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common"
import { InjectQueue } from "@nestjs/bullmq"
import { Queue } from "bullmq"
import { EventsService } from "../events/events.service"
import { QUEUES, JOBS } from "../queue/queue.constants"
import {
	ParsingJobData,
	AiProcessingJobData,
	FailedPhaseValues,
	FailedPhase,
	RedisChannels,
	DocumentStatus,
	DocumentStatusValues,
} from "@shared-types"
import axios from "axios"
import { EnvService } from "../env/env.service"
import {
	RecoveryResponseDto,
	ProcessingStatusResponseDto,
	HealthCheckResponseDto,
	QueuesStatusResponseDto,
} from "./dto/recovery.dto"

interface RecordWithDocuments {
	id: string
	userId: string
	documents: {
		id: string
		status: DocumentStatusValues
		failedPhase: string | null
	}[]
}

@Injectable()
export class RecoveryService {
	private readonly logger = new Logger(RecoveryService.name)

	private readonly documentServiceUrl: string

	constructor(
		private eventsService: EventsService,
		private configService: EnvService,
		@InjectQueue(QUEUES.PARSING) private parsingQueue: Queue,
		@InjectQueue(QUEUES.AI_PROCESSING) private aiProcessingQueue: Queue,
	) {
		this.documentServiceUrl = this.configService.get("DOCUMENT_SERVICE_URL")
	}

	/**
	 * Перезапускает обработку документов для указанной фазы
	 * @param recordId - ID записи
	 * @param phase - Фаза для перезапуска: "parsing" | "processing"
	 */
	async retryProcessing(
		recordId: string,
		phase: FailedPhaseValues,
		userId: string,
	): Promise<RecoveryResponseDto> {
		this.logger.log(
			`🔄 Recovery request for record ${recordId}, phase: ${phase}, user: ${userId}`,
		)

		if (phase === FailedPhase.PARSING) {
			return this.retryParsing(recordId, userId)
		} else {
			return this.retryAiProcessing(recordId, userId)
		}
	}

	/**
	 * Запрос на повторный парсинг через событие
	 */
	private async retryParsing(
		recordId: string,
		userId: string,
	): Promise<RecoveryResponseDto> {
		// Публикуем запрос на повторный парсинг
		await this.eventsService.publishToChannel(
			RedisChannels.REQUEST_RETRY_PARSING,
			{
				recordId,
				userId,
				timestamp: new Date().toISOString(),
			},
		)

		this.logger.log(
			`Request for parsing retry published for record ${recordId}`,
		)

		return {
			success: true,
			recordId,
			phase: FailedPhase.PARSING,
			documentsCount: 0, // Неизвестно на этом этапе
			message: `Started parsing recovery request for record ${recordId}`,
		}
	}

	/**
	 * Запрос на повторную AI обработку через событие
	 */
	private async retryAiProcessing(
		recordId: string,
		userId: string,
	): Promise<RecoveryResponseDto> {
		// Публикуем запрос на повторную AI обработку
		await this.eventsService.publishToChannel(
			RedisChannels.REQUEST_RETRY_AI,
			{
				recordId,
				userId,
				timestamp: new Date().toISOString(),
			},
		)

		this.logger.log(
			`Request for AI processing retry published for record ${recordId}`,
		)

		return {
			success: true,
			recordId,
			phase: FailedPhase.PROCESSING,
			documentsCount: 0, // Неизвестно на этом этапе
			message: `Started AI processing recovery request for record ${recordId}`,
		}
	}

	/**
	 * Получает статус обработки Record из document-service + локальные очереди
	 */
	async getProcessingStatus(
		recordId: string,
		userId: string,
	): Promise<ProcessingStatusResponseDto> {
		try {
			// 1. Получаем документы из document-service
			const response = await axios.get(
				`${this.documentServiceUrl}/documents/record/${recordId}`,
				{
					headers: { "x-user-id": userId },
				},
			)

			const documents = response.data as {
				id: string
				status: DocumentStatusValues
				failedPhase: string | null
			}[]

			// 2. Получаем статистику очередей
			const [parsingStats, aiStats] = await Promise.all([
				this.getQueueStats(this.parsingQueue),
				this.getQueueStats(this.aiProcessingQueue),
			])

			// 3. Определяем общий статус Record
			const overallStatus = this.determineOverallStatus(
				documents.map((d) => d.status),
			)

			return {
				recordId,
				status: overallStatus,
				documents: documents as any, // Cast to avoid strict type checks on DTO
				parsingQueueStats: parsingStats,
				aiQueueStats: aiStats,
			}
		} catch (error) {
			if (axios.isAxiosError(error) && error.response?.status === 404) {
				throw new HttpException(
					"Record not found",
					HttpStatus.NOT_FOUND,
				)
			}
			this.logger.error(
				`Failed to get processing status: ${error.message}`,
			)
			throw new HttpException(
				"Failed to get processing status",
				HttpStatus.INTERNAL_SERVER_ERROR,
			)
		}
	}

	/**
	 * Возвращает статистику очереди
	 */
	private async getQueueStats(
		queue: Queue,
	): Promise<{ waiting: number; active: number; failed: number }> {
		const [waiting, active, failed] = await Promise.all([
			queue.getWaitingCount(),
			queue.getActiveCount(),
			queue.getFailedCount(),
		])

		return { waiting, active, failed }
	}

	/**
	 * Определяет общий статус записи по статусам документов
	 */
	private determineOverallStatus(statuses: DocumentStatusValues[]): string {
		if (statuses.every((s) => s === DocumentStatus.COMPLETED)) {
			return "COMPLETED"
		} else if (statuses.some((s) => s === DocumentStatus.FAILED)) {
			return "FAILED"
		} else if (statuses.some((s) => s === DocumentStatus.PROCESSING)) {
			return "PROCESSING"
		} else if (statuses.some((s) => s === DocumentStatus.PARSING)) {
			return "PARSING"
		} else {
			return "UPLOADING"
		}
	}

	/**
	 * Возвращает информацию о здоровье сервиса
	 */
	async getHealthCheck(): Promise<HealthCheckResponseDto> {
		const [redisStatus, dbStatus, parsingQueueStatus, aiQueueStatus] =
			await Promise.all([
				this.checkRedisConnection(),
				this.checkDatabaseConnection(),
				this.checkQueueHealth(this.parsingQueue),
				this.checkQueueHealth(this.aiProcessingQueue),
			])

		return {
			status: "ok",
			service: "processing-service",
			uptime: process.uptime(),
			timestamp: new Date().toISOString(),
			connections: {
				redis: redisStatus,
				database: dbStatus,
				parsingQueue: parsingQueueStatus,
				aiProcessingQueue: aiQueueStatus,
			},
		}
	}

	/**
	 * Проверяет подключение к Redis
	 */
	private async checkRedisConnection(): Promise<string> {
		try {
			await this.parsingQueue.client
			return "connected"
		} catch {
			return "disconnected"
		}
	}

	/**
	 * Проверяет подключение к базе данных
	 */
	private async checkDatabaseConnection(): Promise<string> {
		// Processing Service больше не использует собственную БД напрямую здесь
		// Можно проверить подключение к Document Service через HTTP
		try {
			await axios.get(`${this.documentServiceUrl}/api/health`, {
				timeout: 2000,
			})
			return "connected (via http)"
		} catch {
			return "disconnected (document-service)"
		}
	}

	/**
	 * Проверяет здоровье очереди
	 */
	private async checkQueueHealth(queue: Queue): Promise<string> {
		try {
			await queue.getWaitingCount()
			return "ready"
		} catch {
			return "unavailable"
		}
	}

	/**
	 * Возвращает статус очередей
	 */
	async getQueuesStatus(): Promise<QueuesStatusResponseDto> {
		const [parsingStats, aiStats] = await Promise.all([
			this.getQueueStats(this.parsingQueue),
			this.getQueueStats(this.aiProcessingQueue),
		])

		return {
			parsing: {
				name: QUEUES.PARSING,
				status: "ready",
				stats: parsingStats,
			},
			aiProcessing: {
				name: QUEUES.AI_PROCESSING,
				status: "ready",
				stats: aiStats,
			},
		}
	}
}
