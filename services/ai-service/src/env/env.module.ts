import { EnvService } from "./env.service"
/*
https://docs.nestjs.com/modules
*/

import { Global, Module } from "@nestjs/common"

@Global()
@Module({
	imports: [],
	controllers: [],
	providers: [EnvService],
	exports: [EnvService],
})
export class EnvModule {}
