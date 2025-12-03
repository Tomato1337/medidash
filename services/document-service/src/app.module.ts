import { TagsModule } from "./tags/tags.module"
import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { PrismaModule } from "./prisma/prisma.module"
import { MinioModule } from "./minio/minio.module"
import { RedisModule } from "./redis/redis.module"
import { RecordsModule } from "./records/records.module"
import { DocumentsModule } from "./documents/documents.module"
import { HealthModule } from "./health/health.module"
import { EnvModule } from "./env/env.module"
import configuration from "./env/configuration"
import { validateEnv } from "./env/env.schema"

@Module({
	imports: [
		EnvModule,
		TagsModule,
		ConfigModule.forRoot({
			isGlobal: true,
			load: [configuration],
			validate: validateEnv,
		}),
		HealthModule,
		PrismaModule,
		MinioModule,
		RedisModule,
		RecordsModule,
		DocumentsModule,
		TagsModule,
	],
})
export class AppModule {}
