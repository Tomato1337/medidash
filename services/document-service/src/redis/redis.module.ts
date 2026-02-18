import { Module, Global, forwardRef } from "@nestjs/common"
import { RedisService } from "./redis.service"
import { DocumentsModule } from "../documents/documents.module"

@Global()
@Module({
	imports: [forwardRef(() => DocumentsModule)],
	providers: [RedisService],
	exports: [RedisService],
})
export class RedisModule {}
