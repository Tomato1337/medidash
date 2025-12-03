import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { PrismaModule } from "./prisma/prisma.module"
import { HealthModule } from "./health/health.module"
import { QueueModule } from "./queue/queue.module"
import { MinioModule } from "./minio/minio.module"
import { EventsModule } from "./events/events.module"
import { ParsingModule } from "./parsing/parsing.module"
import { AiProcessingModule } from "./ai-processing/ai-processing.module"
import { RecoveryModule } from "./recovery/recovery.module"
import configuration from "./env/configuration"
import { EnvModule } from "./env/env.module"

@Module({
	imports: [
		EnvModule,
		ConfigModule.forRoot({
			isGlobal: true,
			load: [configuration],
		}),
		// Core modules
		PrismaModule,
		HealthModule,
		// Infrastructure
		QueueModule,
		MinioModule,
		EventsModule,
		// Processing modules
		ParsingModule,
		AiProcessingModule,
		// API
		RecoveryModule,
	],
})
export class AppModule {}
