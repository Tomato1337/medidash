import { Module, forwardRef } from "@nestjs/common"
import { DocumentsController } from "./documents.controller"
import { DocumentsService } from "./documents.service"
import { RedisModule } from "../redis/redis.module"

@Module({
	imports: [forwardRef(() => RedisModule)],
	controllers: [DocumentsController],
	providers: [DocumentsService],
	exports: [DocumentsService],
})
export class DocumentsModule {}
