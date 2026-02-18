import {
	Injectable,
	OnModuleInit,
	OnModuleDestroy,
	Logger,
} from "@nestjs/common"
import { InjectQueue } from "@nestjs/bullmq"
import { Queue } from "bullmq"
import Redis, { RedisOptions } from "ioredis"
import {
	RedisChannels,
	ProcessingEvent,
	ParsingJobData,
	AiProcessingJobData,
} from "@shared-types"
import { QUEUES, JOBS } from "../queue/queue.constants"
import { EnvService } from "src/env/env.service"

@Injectable()
export class EventsService implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(EventsService.name)
	private subscriber: Redis | null = null
	private publisher: Redis | null = null

	constructor(
		private configService: EnvService,
		@InjectQueue(QUEUES.PARSING) private parsingQueue: Queue,
		@InjectQueue(QUEUES.AI_PROCESSING) private aiProcessingQueue: Queue,
	) {}

	async onModuleInit() {
		const redisHost = this.configService.get("REDIS_HOST")
		const redisPort = this.configService.get("REDIS_PORT")
		const redisPassword = this.configService.get("REDIS_PASSWORD")

		this.logger.log(`🔌 Connecting to Redis at ${redisHost}:${redisPort}`)

		// Создаем конфиг без пароля если он пустой
		const redisConfig: RedisOptions = {
			host: redisHost,
			port: redisPort,
			maxRetriesPerRequest: null,
			retryStrategy: (times) => {
				if (times > 10) {
					this.logger.error(
						"❌ Max Redis reconnection attempts reached",
					)
					return null
				}
				return Math.min(times * 100, 3000)
			},
		}

		// Добавляем пароль только если он задан
		if (redisPassword) {
			redisConfig.password = redisPassword
		}

		// Создаем subscriber с обработчиками событий ДО подключения
		this.subscriber = new Redis({
			...redisConfig,
			lazyConnect: true, // Не подключаться автоматически
		})

		// Создаем publisher
		this.publisher = new Redis({
			...redisConfig,
			lazyConnect: true,
		})

		// Устанавливаем обработчики ПЕРЕД подключением
		this.subscriber.on("connect", () => {
			this.logger.log("✅ Redis subscriber connected")
		})

		this.subscriber.on("ready", () => {
			this.logger.log("✅ Redis subscriber ready")
		})

		this.subscriber.on("error", (err) => {
			this.logger.error(`❌ Redis subscriber error: ${err.message}`)
		})

		this.subscriber.on("close", () => {
			this.logger.warn("⚠️ Redis subscriber connection closed")
		})

		this.subscriber.on("reconnecting", () => {
			this.logger.log("🔄 Redis subscriber reconnecting...")
		})

		this.publisher.on("connect", () => {
			this.logger.log("✅ Redis publisher connected")
		})

		this.publisher.on("error", (err) => {
			this.logger.error(`❌ Redis publisher error: ${err.message}`)
		})

		// Обработчик сообщений - ОБЯЗАТЕЛЬНО до subscribe
		this.subscriber.on("message", async (channel, message) => {
			this.logger.log(`📨 Received message on channel: ${channel}`)
			if (channel === RedisChannels.RECORD_READY_FOR_PARSING) {
				await this.handleRecordReadyForParsing(message)
			} else if (channel === RedisChannels.RECORD_READY_FOR_AI) {
				await this.handleRecordReadyForAi(message)
			}
		})

		// Теперь подключаемся
		try {
			await this.subscriber.connect()
			await this.publisher.connect()

			// Подписка на каналы
			const result = await this.subscriber.subscribe(
				RedisChannels.RECORD_READY_FOR_PARSING,
				RedisChannels.RECORD_READY_FOR_AI,
			)
			this.logger.log(
				`📡 Successfully subscribed to ${RedisChannels.RECORD_READY_FOR_PARSING} (${result} channels)`,
			)
		} catch (err) {
			this.logger.error(`❌ Failed to connect/subscribe: ${err}`)
			throw err
		}
	}

	async onModuleDestroy() {
		if (this.subscriber) {
			await this.subscriber.unsubscribe()
			await this.subscriber.quit()
		}
		if (this.publisher) {
			await this.publisher.quit()
		}
		this.logger.log("Redis connections closed")
	}

	/**
	 * Обработка события готовности Record к парсингу
	 * Создает задачи парсинга для каждого документа
	 */
	private async handleRecordReadyForParsing(message: string): Promise<void> {
		try {
			const data = JSON.parse(message) as {
				recordId: string
				userId: string
				documents: {
					id: string
					minioObjectKey: string
					mimeType: string
					originalFileName: string
				}[]
				timestamp: string
			}

			this.logger.log(
				`📥 Received record.ready-for-parsing for record ${data.recordId} with ${data.documents.length} documents`,
			)

			const allDocumentIds = data.documents.map((d) => d.id)

			// Создаем задачу парсинга для каждого документа
			const jobs = data.documents.map((doc) => ({
				name: JOBS.PARSE_DOCUMENT,
				data: {
					documentId: doc.id,
					recordId: data.recordId,
					userId: data.userId,
					minioObjectKey: doc.minioObjectKey,
					mimeType: doc.mimeType,
					originalFileName: doc.originalFileName,
					allDocumentIds,
				} satisfies ParsingJobData,
				opts: {
					attempts: 3,
					backoff: {
						type: "exponential" as const,
						delay: 1000,
					},
					removeOnComplete: {
						count: 100,
						age: 24 * 60 * 60, // 24 hours
					},
					removeOnFail: {
						count: 50,
					},
				},
			}))

			await this.parsingQueue.addBulk(jobs)

			this.logger.log(
				`📝 Added ${jobs.length} parsing jobs for record ${data.recordId}`,
			)

			// Публикуем событие о начале парсинга
			await this.publishEvent({
				type: "parsing:started",
				recordId: data.recordId,
				userId: data.userId,
				documentId: data.documents[0].id, // первый документ для логирования
				timestamp: new Date().toISOString(),
				data: {
					totalDocuments: data.documents.length,
				},
			})
		} catch (error) {
			this.logger.error(
				`Failed to handle record.ready-for-parsing: ${error instanceof Error ? error.message : error}`,
			)
		}
	}

	/**
	 * Публикует событие обработки для WebSocket Gateway
	 */
	async publishEvent(event: ProcessingEvent): Promise<void> {
		if (!this.publisher) {
			this.logger.warn("Publisher not initialized, skipping event")
			return
		}
		const message = JSON.stringify(event)
		await this.publisher.publish(RedisChannels.PROCESSING_EVENTS, message)

		this.logger.debug(
			`📤 Published ${event.type} for record ${event.recordId}`,
		)
	}

	/**
	 * Публикует сообщение в произвольный Redis канал
	 * Используется для межсервисных событий (document.status.update, document.parsed, record.ai.completed)
	 */
	async publishToChannel(
		channel: string,
		data: Record<string, unknown>,
	): Promise<void> {
		if (!this.publisher) {
			this.logger.warn(
				"Publisher not initialized, skipping channel publish",
			)
			return
		}
		await this.publisher.publish(channel, JSON.stringify(data))
		this.logger.debug(`📤 Published to channel ${channel}`)
	}

	/**
	 * Публикует результат AI обработки Record в document-service через Redis.
	 */
	async publishRecordAiCompleted(
		recordId: string,
		userId: string,
		data: {
			title: string
			summary: string
			description: string
			structuredData?: Record<string, unknown>
			tags: string[]
			extractedDate?: string
		},
	): Promise<void> {
		await this.publishToChannel(RedisChannels.RECORD_AI_COMPLETED, {
			recordId,
			userId,
			...data,
		})
	}

	/**
	 * Обработка события готовности Record к AI обработке
	 * Создает задачу AI обработки для всего Record
	 */
	private async handleRecordReadyForAi(message: string): Promise<void> {
		try {
			const data = JSON.parse(message) as {
				recordId: string
				userId: string
				documentIds: string[]
			}

			this.logger.log(
				`📥 Received record.ready-for-ai for record ${data.recordId} with ${data.documentIds.length} documents`,
			)

			// Создаем задачу AI обработки
			await this.aiProcessingQueue.add(
				JOBS.PROCESS_RECORD,
				{
					recordId: data.recordId,
					userId: data.userId,
					documentIds: data.documentIds,
				} satisfies AiProcessingJobData,
				{
					attempts: 3,
					backoff: {
						type: "exponential",
						delay: 1000,
					},
					removeOnComplete: {
						count: 100,
						age: 24 * 60 * 60, // 24 hours
					},
					removeOnFail: {
						count: 50,
					},
				},
			)

			this.logger.log(
				`📝 Added AI processing job for record ${data.recordId}`,
			)

			// Публикуем событие о начале обработки
			await this.publishEvent({
				type: "processing:started",
				recordId: data.recordId,
				userId: data.userId,
				timestamp: new Date().toISOString(),
			})
		} catch (error) {
			this.logger.error(
				`Failed to handle record.ready-for-ai: ${error instanceof Error ? error.message : error}`,
			)
		}
	}

	// Removed triggerParsingForDocuments as it is dead code and lacks necessary metadata for ParsingJobData
	// RecoveryService now uses publishToChannel to request retry from document-service
}
