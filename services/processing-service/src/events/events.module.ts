import { Module, Global } from "@nestjs/common"
import { BullModule } from "@nestjs/bullmq"
import { EventsService } from "./events.service"
import { QUEUES } from "../queue/queue.constants"

@Global()
@Module({
	imports: [BullModule.registerQueue({ name: QUEUES.PARSING })],
	providers: [EventsService],
	exports: [EventsService],
})
export class EventsModule {}
