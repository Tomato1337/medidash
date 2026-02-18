import {
	Injectable,
	OnModuleInit,
	OnModuleDestroy,
	Logger,
	ForwardReference,
	Inject,
	forwardRef,
} from "@nestjs/common"
import Redis, { RedisOptions } from "ioredis"
import { RedisChannels } from "@shared-types"
import { EnvService } from "src/env/env.service"
import { DocumentsService } from "../documents/documents.service"

interface DocumentMeta {
	id: string
	minioObjectKey: string
	mimeType: string
	originalFileName: string
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(RedisService.name)
	private readonly publisher: Redis
	private subscriber: Redis | null = null

	constructor(
		private configService: EnvService,
		@Inject(forwardRef(() => DocumentsService))
		private documentsService: DocumentsService,
	) {
		const redisHost = this.configService.get("REDIS_HOST")
		const redisPort = this.configService.get("REDIS_PORT")

		this.logger.log(`🔌 Connecting to Redis at ${redisHost}:${redisPort}`)

		const redisConfig: RedisOptions = {
			host: redisHost,
			port: redisPort,
			password: this.configService.get("REDIS_PASSWORD") || undefined,
			maxRetriesPerRequest: 3,
		}

		this.publisher = new Redis(redisConfig)

		this.publisher.on("connect", () => {
			this.logger.log(
				`✅ Connected to Redis at ${redisHost}:${redisPort}`,
			)
		})

		this.publisher.on("error", (err) => {
			this.logger.error(`❌ Redis publisher error: ${err.message}`)
		})
	}

	async onModuleInit() {
		const redisHost = this.configService.get("REDIS_HOST")
		const redisPort = this.configService.get("REDIS_PORT")

		this.subscriber = new Redis({
			host: redisHost,
			port: redisPort,
			password: this.configService.get("REDIS_PASSWORD") || undefined,
			maxRetriesPerRequest: null,
			lazyConnect: true,
		})

		this.subscriber.on("connect", () => {
			this.logger.log("✅ Redis subscriber connected")
		})

		this.subscriber.on("error", (err) => {
			this.logger.error(`❌ Redis subscriber error: ${err.message}`)
		})

		this.subscriber.on("message", async (channel, message) => {
			try {
				const data = JSON.parse(message) as Record<string, unknown>
				if (channel === RedisChannels.DOCUMENT_STATUS_UPDATE) {
					await this.handleDocumentStatusUpdate(data)
				} else if (channel === RedisChannels.DOCUMENT_PARSED) {
					await this.handleDocumentParsed(data)
				} else if (channel === RedisChannels.RECORD_AI_COMPLETED) {
					await this.handleRecordAiCompleted(data)
				} else if (channel === RedisChannels.REQUEST_RETRY_PARSING) {
					await this.handleRequestRetryParsing(data)
				} else if (channel === RedisChannels.REQUEST_RETRY_AI) {
					await this.handleRequestRetryAi(data)
				}
			} catch (err) {
				this.logger.error(
					`Failed to handle message on ${channel}: ${err}`,
				)
			}
		})

		await this.subscriber.connect()

		await this.subscriber.subscribe(
			RedisChannels.DOCUMENT_STATUS_UPDATE,
			RedisChannels.DOCUMENT_PARSED,
			RedisChannels.RECORD_AI_COMPLETED,
			RedisChannels.REQUEST_RETRY_PARSING,
			RedisChannels.REQUEST_RETRY_AI,
		)

		this.logger.log(
			`📡 Subscribed to processing-service channels: ${RedisChannels.DOCUMENT_STATUS_UPDATE}, ${RedisChannels.DOCUMENT_PARSED}, ${RedisChannels.RECORD_AI_COMPLETED}, ${RedisChannels.REQUEST_RETRY_PARSING}, ${RedisChannels.REQUEST_RETRY_AI}`,
		)
	}

	async onModuleDestroy() {
		if (this.subscriber) {
			await this.subscriber.unsubscribe()
			await this.subscriber.quit()
		}
		await this.publisher.quit()
		this.logger.log("Redis connections closed")
	}

	/**
	 * Публикует событие о готовности Record к парсингу.
	 * Processing Service подписан на этот канал.
	 * Включает метаданные документов, чтобы processing-service не делал запросы в БД.
	 */
	async publishRecordReadyForParsing(data: {
		recordId: string
		userId: string
		documents: DocumentMeta[]
	}): Promise<void> {
		const message = JSON.stringify({
			...data,
			timestamp: new Date().toISOString(),
		})

		await this.publisher.publish(
			RedisChannels.RECORD_READY_FOR_PARSING,
			message,
		)

		this.logger.log(
			`📤 Published record.ready-for-parsing for record ${data.recordId} with ${data.documents.length} documents`,
		)
	}

	/**
	 * Generic publish method
	 */
	async publish(
		channel: string,
		message: Record<string, unknown>,
	): Promise<void> {
		this.logger.log(`📤 Publishing to ${channel}`)
		await this.publisher.publish(channel, JSON.stringify(message))
	}

	// ─── Handlers for events from processing-service ───────────────────────────

	private async handleDocumentStatusUpdate(
		data: Record<string, unknown>,
	): Promise<void> {
		const { documentId, status, errorMessage, failedPhase } = data as {
			documentId: string
			status: string
			errorMessage?: string
			failedPhase?: string
		}

		this.logger.log(
			`📥 document.status.update: doc=${documentId} status=${status}`,
		)

		await this.documentsService.updateDocumentStatusFromEvent(
			documentId,
			status,
			errorMessage,
			failedPhase,
		)
	}

	private async handleDocumentParsed(
		data: Record<string, unknown>,
	): Promise<void> {
		const { documentId, extractedText, metadata } = data as {
			documentId: string
			extractedText: string
			metadata: Record<string, unknown>
		}

		this.logger.log(`📥 document.parsed: doc=${documentId}`)

		await this.documentsService.updateDocumentExtractedContent(
			documentId,
			extractedText,
			metadata,
		)
	}

	private async handleRecordAiCompleted(
		data: Record<string, unknown>,
	): Promise<void> {
		const { recordId, tags, title, extractedDate, summary, description } =
			data as {
				recordId: string
				tags?: string[]
				title?: string
				extractedDate?: string
				summary?: string
				description?: string
			}

		this.logger.log(`📥 record.ai.completed: record=${recordId}`)

		await this.documentsService.updateRecordFromAiResult(
			recordId,
			tags,
			title,
			extractedDate ? new Date(extractedDate) : undefined,
			summary,
			description,
		)
	}

	private async handleRequestRetryParsing(
		data: Record<string, unknown>,
	): Promise<void> {
		const { recordId, userId } = data as {
			recordId: string
			userId: string
		}
		this.logger.log(`📥 request.retry.parsing: record=${recordId}`)
		await this.documentsService.handleRetryParsing(recordId, userId)
	}

	private async handleRequestRetryAi(
		data: Record<string, unknown>,
	): Promise<void> {
		const { recordId, userId } = data as {
			recordId: string
			userId: string
		}
		this.logger.log(`📥 request.retry.ai: record=${recordId}`)
		await this.documentsService.handleRetryAi(recordId, userId)
	}
}
