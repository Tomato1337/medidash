import { Injectable, OnModuleDestroy, Logger } from "@nestjs/common"
import Redis from "ioredis"
import { RedisChannels } from "@shared-types"
import { EnvService } from "src/env/env.service"

@Injectable()
export class RedisService implements OnModuleDestroy {
	private readonly logger = new Logger(RedisService.name)
	private readonly publisher: Redis

	constructor(private configService: EnvService) {
		const redisHost = this.configService.get("REDIS_HOST")
		const redisPort = this.configService.get("REDIS_PORT")

		this.logger.log(`🔌 Connecting to Redis at ${redisHost}:${redisPort}`)

		this.publisher = new Redis({
			host: redisHost,
			port: redisPort,
			password: this.configService.get("REDIS_PASSWORD"),
			maxRetriesPerRequest: 3,
		})

		this.publisher.on("connect", () => {
			this.logger.log(
				`✅ Connected to Redis at ${redisHost}:${redisPort}`,
			)
		})

		this.publisher.on("error", (err) => {
			this.logger.error(`❌ Redis error: ${err.message}`)
		})
	}

	async onModuleDestroy() {
		await this.publisher.quit()
		this.logger.log("Redis connection closed")
	}

	/**
	 * Публикует событие о готовности Record к парсингу
	 * Processing Service подписан на этот канал
	 */
	async publishRecordReadyForParsing(data: {
		recordId: string
		userId: string
		documentIds: string[]
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
			`📤 Published record.ready-for-parsing for record ${data.recordId} with ${data.documentIds.length} documents`,
		)
	}
}
