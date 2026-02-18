import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq"
import { Logger } from "@nestjs/common"
import { Job } from "bullmq"
import { AiProcessingJobData, FailedPhase, DocumentStatus } from "@shared-types"
import { AiProcessingService } from "./ai-processing.service"
import { EventsService } from "../events/events.service"
import { QUEUES } from "../queue/queue.constants"

@Processor(QUEUES.AI_PROCESSING, {
	concurrency: 1, // AI запросы дорогие, обрабатываем по одному
})
export class AiProcessingProcessor extends WorkerHost {
	private readonly logger = new Logger(AiProcessingProcessor.name)

	constructor(
		private aiProcessingService: AiProcessingService,
		private eventsService: EventsService,
	) {
		super()
	}

	async process(job: Job<AiProcessingJobData>): Promise<void> {
		const { recordId, userId, documentIds } = job.data

		this.logger.log(
			`🤖 Processing AI job for record ${recordId} with ${documentIds.length} documents`,
		)

		try {
			// Публикуем событие о начале AI обработки
			await this.eventsService.publishEvent({
				type: "processing:started",
				recordId,
				userId,
				documentId: documentIds[0],
				timestamp: new Date().toISOString(),
				data: {
					totalDocuments: documentIds.length,
				},
			})

			// Получаем чанки из таблицы DocumentChunk (созданы на этапе парсинга)
			const chunks =
				await this.aiProcessingService.getChunksFromDatabase(
					documentIds,
				)

			if (chunks.length === 0) {
				throw new Error(
					`No chunks found in DocumentChunk table for documents in record ${recordId}`,
				)
			}

			this.logger.log(
				`📝 Processing ${chunks.length} chunks for record ${recordId}`,
			)

			// Обрабатываем чанки: анонимизация + генерация эмбеддингов
			const processedChunks =
				await this.aiProcessingService.processChunks(chunks)

			this.logger.log(
				`🧠 Processed ${processedChunks.length} chunks (anonymization + embeddings)`,
			)

			// Сохраняем обработанные чанки в базу
			await this.aiProcessingService.saveProcessedChunks(processedChunks)

			// Собираем анонимизированный текст для саммари
			const allAnonymizedText = processedChunks
				.map((c) => c.anonymizedContent)
				.join("\n\n")

			// Генерируем общий саммари для Record (используем TONL для экономии)
			const { summary, report, tags, tokensUsed, title } =
				await this.aiProcessingService.generateSummary(
					allAnonymizedText,
				)

			// Отправляем результаты обработки в document-service через Redis
			await this.aiProcessingService.notifyRecordProcessingCompleted(
				recordId,
				userId,
				{
					title,
					summary,
					report,
					tags,
					tokensUsed,
					structuredData: {}, // TODO: Add structured data generation
				},
			)

			// Обновляем статус всех документов на COMPLETED
			await this.aiProcessingService.updateRecordDocumentsStatus(
				documentIds,
				DocumentStatus.COMPLETED,
			)

			// Подсчитываем общее количество PII маппингов
			const totalPiiMappings = processedChunks.reduce(
				(sum, c) => sum + c.piiMappings.length,
				0,
			)

			// Публикуем событие об успешном завершении
			await this.eventsService.publishEvent({
				type: "processing:completed",
				recordId,
				userId,
				documentId: documentIds[0],
				timestamp: new Date().toISOString(),
				data: {
					totalDocuments: documentIds.length,
					chunksProcessed: processedChunks.length,
					piiMappingsCreated: totalPiiMappings,
					tokensUsed,
					summaryLength: summary.length,
				},
			})

			this.logger.log(
				`✅ AI processing completed for record ${recordId}: ${processedChunks.length} chunks, ${summary.length} chars summary`,
			)
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error)

			this.logger.error(
				`❌ AI processing failed for record ${recordId}: ${errorMessage}`,
			)

			// Обновляем статус документов на FAILED с указанием фазы
			for (const documentId of documentIds) {
				await this.aiProcessingService.updateDocumentStatus(
					documentId,
					DocumentStatus.FAILED,
					errorMessage,
					FailedPhase.PROCESSING,
				)
			}

			// Публикуем событие об ошибке
			await this.eventsService.publishEvent({
				type: "processing:failed",
				recordId,
				userId,
				documentId: documentIds[0],
				timestamp: new Date().toISOString(),
				error: errorMessage,
			})

			throw error // Re-throw для BullMQ retry logic
		}
	}

	@OnWorkerEvent("active")
	onActive(job: Job<AiProcessingJobData>) {
		this.logger.debug(
			`AI Job ${job.id} for record ${job.data.recordId} is active`,
		)
	}

	@OnWorkerEvent("completed")
	onCompleted(job: Job<AiProcessingJobData>) {
		this.logger.debug(
			`AI Job ${job.id} for record ${job.data.recordId} completed`,
		)
	}

	@OnWorkerEvent("failed")
	onFailed(job: Job<AiProcessingJobData> | undefined, error: Error) {
		this.logger.error(
			`AI Job ${job?.id} for record ${job?.data.recordId} failed: ${error.message}`,
		)
	}
}
