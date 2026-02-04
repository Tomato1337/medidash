import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq"
import { Logger } from "@nestjs/common"
import { Job } from "bullmq"
import { DocumentStatus } from "generated/prisma"
import { ParsingJobData, AiProcessingJobData } from "@shared-types"
import { InjectQueue } from "@nestjs/bullmq"
import { Queue } from "bullmq"
import { ParsingService } from "./parsing.service"
import { EventsService } from "../events/events.service"
import { QUEUES, JOBS } from "../queue/queue.constants"
import { FailedPhase } from "@shared-types"

@Processor(QUEUES.PARSING, {
	concurrency: 2, // Будет переопределено в модуле
})
export class ParsingProcessor extends WorkerHost {
	private readonly logger = new Logger(ParsingProcessor.name)

	constructor(
		private parsingService: ParsingService,
		private eventsService: EventsService,
		@InjectQueue(QUEUES.AI_PROCESSING) private aiProcessingQueue: Queue,
	) {
		super()
	}

	async process(job: Job<ParsingJobData>): Promise<void> {
		const { documentId, recordId, userId } = job.data

		this.logger.log(`🔄 Processing parsing job for document ${documentId}`)

		try {
			// Получаем документ из БД
			const document = await this.parsingService.getDocument(documentId)

			if (!document) {
				throw new Error(`Document ${documentId} not found`)
			}

			if (document.deletedAt) {
				this.logger.warn(`Document ${documentId} was deleted, skipping`)
				return
			}

			// Публикуем событие о начале парсинга документа
			await this.eventsService.publishEvent({
				type: "parsing:document:started",
				recordId,
				userId,
				documentId,
				timestamp: new Date().toISOString(),
				data: {
					filename: document.originalFileName,
				},
			})

			// Скачиваем и парсим документ (PDF или TXT)
			const content = await this.parsingService.parseDocument(
				document.minioObjectKey,
				document.mimeType,
			)

			// Разбиваем на чанки
			const chunks = this.parsingService.splitIntoChunks(
				content.text.toLowerCase().trim(),
			)

			// Сохраняем результат (raw текст + чанки в DocumentChunk)
			await this.parsingService.saveExtractedContent(
				documentId,
				userId,
				content,
				chunks,
			)

			// Обновляем статус на PROCESSING (готов к AI обработке)
			await this.parsingService.updateDocumentStatus(
				documentId,
				DocumentStatus.PROCESSING,
			)

			// Публикуем событие об успешном парсинге
			await this.eventsService.publishEvent({
				type: "parsing:document:completed",
				recordId,
				userId,
				documentId,
				timestamp: new Date().toISOString(),
				data: {
					textLength: content.text.length,
					chunksCount: chunks.length,
					pageCount: content.pageCount,
				},
			})

			this.logger.log(
				`✅ Parsed document ${documentId}: ${content.text.length} chars, ${chunks.length} chunks`,
			)

			// Проверяем, все ли документы Record спарсены
			const { allParsed, documentIds } =
				await this.parsingService.checkAllDocumentsParsed(recordId)

			if (allParsed) {
				this.logger.log(
					`📦 All documents for record ${recordId} are parsed, triggering AI processing`,
				)

				// Публикуем событие о завершении парсинга всех документов
				await this.eventsService.publishEvent({
					type: "parsing:completed",
					recordId,
					userId,
					documentId,
					timestamp: new Date().toISOString(),
					data: {
						totalDocuments: documentIds.length,
					},
				})

				// Добавляем задачу AI обработки для всего Record
				await this.aiProcessingQueue.add(
					JOBS.PROCESS_RECORD,
					{
						recordId,
						userId,
						documentIds,
					} satisfies AiProcessingJobData,
					{
						attempts: 3,
						backoff: {
							type: "exponential",
							delay: 2000,
						},
						removeOnComplete: {
							count: 50,
							age: 24 * 60 * 60,
						},
						removeOnFail: {
							count: 50,
						},
					},
				)
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error)

			this.logger.error(
				`❌ Failed to parse document ${documentId}: ${errorMessage}`,
			)

			// Обновляем статус на FAILED с указанием фазы
			await this.parsingService.updateDocumentStatus(
				documentId,
				DocumentStatus.FAILED,
				errorMessage,
				FailedPhase.PARSING,
			)

			// Публикуем событие об ошибке
			await this.eventsService.publishEvent({
				type: "parsing:failed",
				recordId,
				userId,
				documentId,
				timestamp: new Date().toISOString(),
				error: errorMessage,
			})

			throw error // Re-throw для BullMQ retry logic
		}
	}

	@OnWorkerEvent("active")
	onActive(job: Job<ParsingJobData>) {
		this.logger.debug(
			`Job ${job.id} for document ${job.data.documentId} is active`,
		)
	}

	@OnWorkerEvent("completed")
	onCompleted(job: Job<ParsingJobData>) {
		this.logger.debug(
			`Job ${job.id} for document ${job.data.documentId} completed`,
		)
	}

	@OnWorkerEvent("failed")
	onFailed(job: Job<ParsingJobData> | undefined, error: Error) {
		this.logger.error(
			`Job ${job?.id} for document ${job?.data.documentId} failed: ${error.message}`,
		)
	}
}
