import { Module } from "@nestjs/common"
import { AiController } from "./ai.controller"
import { AiService } from "./ai.service"
import { GeminiModule } from "../gemini/gemini.module"
import { AnonymizationModule } from "../anonymization/anonymization.module"

@Module({
	imports: [GeminiModule, AnonymizationModule],
	controllers: [AiController],
	providers: [AiService],
	exports: [AiService],
})
export class AiModule {}
