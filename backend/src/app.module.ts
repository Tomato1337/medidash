import { EnvModule } from "./env/env.module"
import { AuthModule } from "./auth/auth.module"
import { UserModule } from "./user/user.module"
import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import configuration from "src/env/configuration"
import { validateEnv } from "src/env/env.schema"

@Module({
	imports: [
		EnvModule,
		ConfigModule.forRoot({
			isGlobal: true,
			load: [configuration],
			validate: validateEnv,
		}),
		AuthModule,
		UserModule,
	],
	controllers: [],
	providers: [],
})
export class AppModule {}
