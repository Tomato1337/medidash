import "tsconfig-paths/register"
import { NestFactory } from "@nestjs/core"
import {
	FastifyAdapter,
	NestFastifyApplication,
} from "@nestjs/platform-fastify"
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger"
import { AppModule } from "./app.module"
import { AiModule } from "./ai/ai.module"
import { ValidationPipe, Logger } from "@nestjs/common"
import fastifyCookie from "@fastify/cookie"

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
		.setTitle("AI Service API")
		.setDescription(
			`AI Service для обработки медицинских документов.
			
Функции:
- Генерация эмбеддингов (Gemini text-embedding-004, 768 dimensions)
- Генерация резюме (Gemini 2.0 Flash)
- Анонимизация текста (spaCy NER)
- OCR для изображений (Tesseract)
			`,
		)
		.setVersion("1.0")
		.build()

	const document = SwaggerModule.createDocument(app, config, {
		include: [AiModule],
	})

	app.getHttpAdapter().get("/api/openapi.json", (req, res) => {
		res.header("Content-Type", "application/json")
		res.send(document)
	})

	const port = process.env.AI_SERVICE_PORT || 3003
	await app.listen(port, "0.0.0.0")

	logger.log(`🚀 AI Service running on: http://localhost:${port}`)
	logger.log(`📄 OpenAPI spec: http://localhost:${port}/api/openapi.json`)
}

bootstrap()
