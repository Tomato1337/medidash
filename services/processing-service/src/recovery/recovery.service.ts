import { Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common"
import { InjectQueue } from "@nestjs/bullmq"
import { Queue } from "bullmq"
import { DocumentStatus } from "generated/prisma"
import { PrismaService } from "../prisma/prisma.service"
import { EventsService } from "../events/events.service"
import { QUEUES, JOBS } from "../queue/queue.constants"
import {
	ParsingJobData,
	AiProcessingJobData,
	FailedPhaseValues,
	FailedPhase,
} from "@shared-types"
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
		status: DocumentStatus
		failedPhase: string | null
	}[]
}

@Injectable()
export class RecoveryService {
	private readonly logger = new Logger(RecoveryService.name)

	constructor(
		private prismaService: PrismaService,
		private eventsService: EventsService,
		@InjectQueue(QUEUES.PARSING) private parsingQueue: Queue,
		@InjectQueue(QUEUES.AI_PROCESSING) private aiProcessingQueue: Queue,
	) {}

	/**
	 * Перезапускает обработку документов для указанной фазы
	 * @param recordId - ID записи
	 * @param phase - Фаза для перезапуска: "parsing" | "processing"
	 */
	async retryProcessing(
		recordId: string,
		phase: FailedPhaseValues,
	): Promise<RecoveryResponseDto> {
		this.logger.log(
			`🔄 Recovery request for record ${recordId}, phase: ${phase}`,
		)

		const record = await this.getRecordWithDocuments(recordId)

		if (phase === FailedPhase.PARSING) {
			return this.retryParsing(record)
		} else {
			return this.retryAiProcessing(record)
		}
	}

	/**
	 * Получает Record с документами
	 */
	private async getRecordWithDocuments(
		recordId: string,
	): Promise<RecordWithDocuments> {
		const record = await this.prismaService.record.findUnique({
			where: { id: recordId },
			include: {
				documents: {
					where: { deletedAt: null },
					select: {
						id: true,
						status: true,
						failedPhase: true,
					},
				},
			},
		})

		if (!record) {
			throw new HttpException(
				`Record ${recordId} not found`,
				HttpStatus.NOT_FOUND,
			)
		}

		return record
	}

	/**
	 * Перезапуск парсинга для документов со статусом FAILED и failedPhase="parsing"
	 */
	private async retryParsing(
		record: RecordWithDocuments,
	): Promise<RecoveryResponseDto> {
		const failedDocuments = record.documents.filter(
			(d) =>
				d.status === DocumentStatus.FAILED &&
				d.failedPhase === FailedPhase.PARSING,
		)

		if (failedDocuments.length === 0) {
			throw new HttpException(
				`No documents with failed parsing found for record ${record.id}`,
				HttpStatus.BAD_REQUEST,
			)
		}

		// Сбрасываем статус на PARSING
		await this.prismaService.document.updateMany({
			where: { id: { in: failedDocuments.map((d) => d.id) } },
			data: {
				status: DocumentStatus.PARSING,
				failedPhase: null,
			},
		})

		// Добавляем задачи парсинга
		const jobs = failedDocuments.map((doc) => ({
			name: JOBS.PARSE_DOCUMENT,
			data: {
				documentId: doc.id,
				recordId: record.id,
				userId: record.userId,
			} satisfies ParsingJobData,
			opts: {
				attempts: 3,
				backoff: {
					type: "exponential" as const,
					delay: 1000,
				},
			},
		}))

		await this.parsingQueue.addBulk(jobs)

		// Публикуем событие о начале восстановления
		await this.eventsService.publishEvent({
			type: "parsing:started",
			recordId: record.id,
			userId: record.userId,
			documentId: failedDocuments[0].id,
			timestamp: new Date().toISOString(),
			data: {
				isRecovery: true,
				totalDocuments: failedDocuments.length,
			},
		})

		this.logger.log(
			`✅ Recovery: Added ${failedDocuments.length} parsing jobs for record ${record.id}`,
		)

		return {
			success: true,
			recordId: record.id,
			phase: FailedPhase.PARSING,
			documentsCount: failedDocuments.length,
			message: `Started parsing recovery for ${failedDocuments.length} documents`,
		}
	}

	/**
	 * Перезапуск AI обработки для документов со статусом FAILED и failedPhase="processing"
	 */
	private async retryAiProcessing(
		record: RecordWithDocuments,
	): Promise<RecoveryResponseDto> {
		const failedDocuments = record.documents.filter(
			(d) =>
				d.status === DocumentStatus.FAILED &&
				d.failedPhase === FailedPhase.PROCESSING,
		)

		if (failedDocuments.length === 0) {
			throw new HttpException(
				`No documents with failed AI processing found for record ${record.id}`,
				HttpStatus.BAD_REQUEST,
			)
		}

		// Также добавляем документы со статусом PROCESSING (они были спарсены, но AI упал)
		const processingDocuments = record.documents.filter(
			(d) => d.status === DocumentStatus.PROCESSING,
		)

		const documentsForProcessing = [
			...failedDocuments,
			...processingDocuments,
		]

		// Сбрасываем статус на PROCESSING
		await this.prismaService.document.updateMany({
			where: { id: { in: documentsForProcessing.map((d) => d.id) } },
			data: {
				status: DocumentStatus.PROCESSING,
				failedPhase: null,
			},
		})

		// Добавляем задачу AI обработки
		await this.aiProcessingQueue.add(
			JOBS.PROCESS_RECORD,
			{
				recordId: record.id,
				userId: record.userId,
				documentIds: documentsForProcessing.map((d) => d.id),
			} satisfies AiProcessingJobData,
			{
				attempts: 3,
				backoff: {
					type: "exponential",
					delay: 2000,
				},
			},
		)

		// Публикуем событие о начале восстановления
		await this.eventsService.publishEvent({
			type: "processing:started",
			recordId: record.id,
			userId: record.userId,
			documentId: documentsForProcessing[0].id,
			timestamp: new Date().toISOString(),
			data: {
				isRecovery: true,
				totalDocuments: documentsForProcessing.length,
			},
		})

		this.logger.log(
			`✅ Recovery: Added AI processing job for record ${record.id} with ${documentsForProcessing.length} documents`,
		)

		return {
			success: true,
			recordId: record.id,
			phase: FailedPhase.PROCESSING,
			documentsCount: documentsForProcessing.length,
			message: `Started AI processing recovery for ${documentsForProcessing.length} documents`,
		}
	}

	/**
	 * Получает статус обработки Record
	 */
	async getProcessingStatus(
		recordId: string,
	): Promise<ProcessingStatusResponseDto> {
		const record = await this.prismaService.record.findUnique({
			where: { id: recordId },
			include: {
				documents: {
					where: { deletedAt: null },
					select: {
						id: true,
						status: true,
						failedPhase: true,
					},
				},
			},
		})

		if (!record) {
			throw new HttpException(
				`Record ${recordId} not found`,
				HttpStatus.NOT_FOUND,
			)
		}

		// Получаем статистику очередей
		const [parsingStats, aiStats] = await Promise.all([
			this.getQueueStats(this.parsingQueue),
			this.getQueueStats(this.aiProcessingQueue),
		])

		// Определяем общий статус Record
		const overallStatus = this.determineOverallStatus(
			record.documents.map((d) => d.status),
		)

		return {
			recordId,
			status: overallStatus,
			documents: record.documents,
			parsingQueueStats: parsingStats,
			aiQueueStats: aiStats,
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
	private determineOverallStatus(statuses: DocumentStatus[]): string {
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
		try {
			await this.prismaService.$queryRaw`SELECT 1`
			return "connected"
		} catch {
			return "disconnected"
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
