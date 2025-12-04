import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { HealthModule } from "./health/health.module"
import { GeminiModule } from "./gemini/gemini.module"
import { AnonymizationModule } from "./anonymization/anonymization.module"
import { AiModule } from "./ai/ai.module"
import { EnvModule } from "./env/env.module"
import configuration from "./env/configuration"

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			load: [configuration],
		}),
		EnvModule,
		HealthModule,
		GeminiModule,
		AnonymizationModule,
		AiModule,
	],
})
export class AppModule {}
