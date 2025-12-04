import "tsconfig-paths/register"
import { NestFactory } from "@nestjs/core"
import {
	FastifyAdapter,
	NestFastifyApplication,
} from "@nestjs/platform-fastify"
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger"
import { AppModule } from "./app.module"
import { ValidationPipe, Logger } from "@nestjs/common"
import fastifyCookie from "@fastify/cookie"
import { RecoveryModule } from "./recovery/recovery.module"

async function bootstrap() {
	const logger = new Logger("Bootstrap")

	const app = await NestFactory.create<NestFastifyApplication>(
		AppModule,
		new FastifyAdapter({
			logger: true,
			trustProxy: true,
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

	const config = new DocumentBuilder()
		.setTitle("Processing Service API")
		.setDescription(
			`Processing Service оркестрирует двухфазную обработку документов через BullMQ.`,
		)
		.setVersion("1.0")
		.build()

	const document = SwaggerModule.createDocument(app, config, {
		include: [RecoveryModule],
	})

	app.getHttpAdapter().get("/api/openapi.json", (req, res) => {
		res.header("Content-Type", "application/json")
		res.send(document)
	})

	const port = process.env.PROCESSING_SERVICE_PORT || 3002
	await app.listen(port, "0.0.0.0")

	logger.log(`🚀 Processing Service running on: http://localhost:${port}`)
	logger.log(`📄 OpenAPI spec: http://localhost:${port}/api/openapi.json`)
}

bootstrap()
