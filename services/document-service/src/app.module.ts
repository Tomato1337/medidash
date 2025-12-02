import { TagsModule } from "./tags/tags.module"
import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { PrismaModule } from "./prisma/prisma.module"
import { MinioModule } from "./minio/minio.module"
import { RecordsModule } from "./records/records.module"
import { DocumentsModule } from "./documents/documents.module"
import { HealthModule } from "./health/health.module"

@Module({
	imports: [
		TagsModule,
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: [".env.local", ".env"],
		}),
		HealthModule,
		PrismaModule,
		MinioModule,
		RecordsModule,
		DocumentsModule,
		TagsModule,
	],
})
export class AppModule {}
