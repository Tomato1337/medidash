import { Module } from "@nestjs/common"
import { BullModule } from "@nestjs/bullmq"
import { RecoveryController } from "./recovery.controller"
import { RecoveryService } from "./recovery.service"
import { QUEUES } from "../queue/queue.constants"

@Module({
	imports: [
		BullModule.registerQueue(
			{ name: QUEUES.PARSING },
			{ name: QUEUES.AI_PROCESSING },
		),
	],
	controllers: [RecoveryController],
	providers: [RecoveryService],
	exports: [RecoveryService],
})
export class RecoveryModule {}
