import { Module } from "@nestjs/common"
import { BullModule } from "@nestjs/bullmq"
import { ConfigService } from "@nestjs/config"
import { QUEUES } from "./queue.constants"

@Module({
	imports: [
		// Глобальная конфигурация BullMQ
		BullModule.forRootAsync({
			useFactory: (configService: ConfigService) => ({
				connection: {
					host: configService.get<string>("REDIS_HOST", "localhost"),
					port: configService.get<number>("REDIS_PORT", 6379),
					password: configService.get<string>("REDIS_PASSWORD"),
				},
				defaultJobOptions: {
					attempts: configService.get<number>(
						"BULL_RETRY_ATTEMPTS",
						3,
					),
					backoff: {
						type: "exponential",
						delay: 2000,
					},
					removeOnComplete: {
						count: 100, // Хранить последние 100 завершённых jobs
						age: 24 * 60 * 60, // или 24 часа
					},
					removeOnFail: {
						count: 500, // Хранить последние 500 failed jobs для анализа
					},
				},
			}),
			inject: [ConfigService],
		}),

		// Регистрация очередей
		BullModule.registerQueue({
			name: QUEUES.PARSING,
		}),
		BullModule.registerQueue({
			name: QUEUES.AI_PROCESSING,
		}),
	],
	exports: [BullModule],
})
export class QueueModule {}
