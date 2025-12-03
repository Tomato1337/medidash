import {
	Injectable,
	OnModuleInit,
	OnModuleDestroy,
	Logger,
} from "@nestjs/common"
import { InjectQueue } from "@nestjs/bullmq"
import { Queue } from "bullmq"
import Redis, { RedisOptions } from "ioredis"
import { RedisChannels, ProcessingEvent, ParsingJobData } from "@shared-types"
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
			}
		})

		// Теперь подключаемся
		try {
			await this.subscriber.connect()
			await this.publisher.connect()

			// Подписка на канал готовности Record к парсингу
			const result = await this.subscriber.subscribe(
				RedisChannels.RECORD_READY_FOR_PARSING,
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
				documentIds: string[]
				timestamp: string
			}

			this.logger.log(
				`📥 Received record.ready-for-parsing for record ${data.recordId} with ${data.documentIds.length} documents`,
			)

			// Создаем задачу парсинга для каждого документа
			const jobs = data.documentIds.map((documentId) => ({
				name: JOBS.PARSE_DOCUMENT,
				data: {
					documentId,
					recordId: data.recordId,
					userId: data.userId,
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
				documentId: data.documentIds[0], // первый документ для логирования
				timestamp: new Date().toISOString(),
				data: {
					totalDocuments: data.documentIds.length,
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
	 * Вручную триггерит парсинг для восстановления
	 * Используется RecoveryController
	 */
	async triggerParsingForDocuments(
		recordId: string,
		userId: string,
		documentIds: string[],
	): Promise<void> {
		const jobs = documentIds.map((documentId) => ({
			name: JOBS.PARSE_DOCUMENT,
			data: {
				documentId,
				recordId,
				userId,
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

		this.logger.log(
			`🔄 Recovery: Added ${jobs.length} parsing jobs for record ${recordId}`,
		)
	}
}
