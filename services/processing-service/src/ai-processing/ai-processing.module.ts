import { Module } from "@nestjs/common"
import { BullModule } from "@nestjs/bullmq"
import { AiProcessingService } from "./ai-processing.service"
import { AiProcessingProcessor } from "./ai-processing.processor"
import { QUEUES } from "../queue/queue.constants"

@Module({
	imports: [BullModule.registerQueue({ name: QUEUES.AI_PROCESSING })],
	providers: [AiProcessingService, AiProcessingProcessor],
	exports: [AiProcessingService],
})
export class AiProcessingModule {}
