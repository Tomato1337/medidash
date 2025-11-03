import { Module, Global } from "@nestjs/common"
import { HttpClientService } from "./http-client.service"
import { EnvModule } from "../env/env.module"

@Global()
@Module({
	imports: [EnvModule],
	providers: [HttpClientService],
	exports: [HttpClientService],
})
export class CommonModule {}
