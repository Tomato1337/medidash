import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { PrismaModule } from "./prisma/prisma.module"
import { HealthModule } from "./health/health.module"
import configuration from './env/configuration'
import { validateEnv } from './env/env.schema'

@Module({
	imports: [
		ConfigModule.forRoot({
                    isGlobal: true,
                    load: [configuration],
                    validate: validateEnv,
                }),
		HealthModule,
		PrismaModule,
	],
})
export class AppModule {}
