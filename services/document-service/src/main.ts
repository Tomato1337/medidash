import "tsconfig-paths/register"
import { NestFactory } from "@nestjs/core"
import {
	FastifyAdapter,
	NestFastifyApplication,
} from "@nestjs/platform-fastify"
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger"
import { AppModule } from "./app.module"
import { RecordsModule } from "./records/records.module"
import { DocumentsModule } from "./documents/documents.module"
import { TagsModule } from "./tags/tags.module"
import { ValidationPipe, Logger } from "@nestjs/common"
import fastifyCookie from "@fastify/cookie"
import fastifyMultipart from "@fastify/multipart"

async function bootstrap() {
	const logger = new Logger("Bootstrap")

	const app = await NestFactory.create<NestFastifyApplication>(
		AppModule,
		new FastifyAdapter({
			logger: true,
			trustProxy: true,
			bodyLimit: 104857600, // 100 MB for file uploads
		}),
	)

	app.setGlobalPrefix("api")

	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			transform: true,
			forbidNonWhitelisted: true,
		}),
	)

	await app.register(fastifyCookie as any)
	await app.register(fastifyMultipart, {
		limits: {
			fileSize: 50 * 1024 * 1024,
			files: 10, // Max 10 files per request
		},
	})

	const config = new DocumentBuilder()
		.setTitle("Document Service")
		.setDescription("Medical documents management microservice")
		.setVersion("1.0")
		.build()

	const document = SwaggerModule.createDocument(app, config, {
		include: [RecordsModule, DocumentsModule, TagsModule],
	})

	app.getHttpAdapter().get("/api/openapi.json", (req, res) => {
		res.header("Content-Type", "application/json")
		res.send(document)
	})

	const port = process.env.DOCUMENT_SERVICE_PORT || 3001
	await app.listen(port, "0.0.0.0")

	logger.log(`🚀 Document Service running on: http://localhost:${port}`)
	logger.log(`📄 OpenAPI spec: http://localhost:${port}/api/openapi.json`)
}

bootstrap()
