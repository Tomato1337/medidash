import { Module } from "@nestjs/common"
import { BullModule } from "@nestjs/bullmq"
import { ParsingService } from "./parsing.service"
import { ParsingProcessor } from "./parsing.processor"
import { QUEUES } from "../queue/queue.constants"

@Module({
	imports: [
		BullModule.registerQueue(
			{ name: QUEUES.PARSING },
			{ name: QUEUES.AI_PROCESSING },
		),
	],
	providers: [ParsingService, ParsingProcessor],
	exports: [ParsingService],
})
export class ParsingModule {}
