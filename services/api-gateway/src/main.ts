import "tsconfig-paths/register"
import { NestFactory } from "@nestjs/core"
import {
	FastifyAdapter,
	NestFastifyApplication,
} from "@nestjs/platform-fastify"
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger"
import { AppModule } from "./app.module"
import { ValidationPipe, Logger } from "@nestjs/common"
import fastifyCookie from "@fastify/cookie"
import { EnvService } from "./env/env.service"

async function bootstrap() {
	const logger = new Logger("Bootstrap")

	const app = await NestFactory.create<NestFastifyApplication>(
		AppModule,
		new FastifyAdapter({
			logger: process.env.NODE_ENV === "dev",
		}),
	)

	const envService = app.get(EnvService)
	const port = envService.get("API_GATEWAY_PORT")
	const corsOrigin = envService.get("CORS_ORIGIN")
	const nodeEnv = envService.get("NODE_ENV")

	const config = new DocumentBuilder()
		.setTitle("Medical Documents API Gateway")
		.setDescription("API Gateway for Medical Documents Management System")
		.setVersion("1.0")
		.addTag("auth", "Authentication endpoints")
		.addTag("users", "User management endpoints")
		.addTag(
			"documents",
			"Document management (proxied to Document Service)",
		)
		.addTag("search", "Search endpoints (proxied to Search Service)")
		.addBearerAuth()
		.build()

	await app.register(fastifyCookie as any)

	app.setGlobalPrefix("api", {
		exclude: [],
	})

	app.enableCors({
		origin: corsOrigin.split(","),
		methods: "GET,POST,PUT,PATCH,DELETE,OPTIONS",
		credentials: true,
		allowedHeaders: "Content-Type, Authorization, Accept",
	})

	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			transform: true,
			forbidNonWhitelisted: true,
			transformOptions: {
				enableImplicitConversion: true,
			},
		}),
	)

	const documentFactory = () => SwaggerModule.createDocument(app, config)
	SwaggerModule.setup("api/docs", app, documentFactory)

	await app.listen(port, "0.0.0.0")

	logger.log(`🚀 API Gateway started on http://0.0.0.0:${port}`)
	logger.log(`📚 Swagger docs available at http://0.0.0.0:${port}/api/docs`)
	logger.log(`🌍 Environment: ${nodeEnv}`)
	logger.log(`🔗 CORS enabled for: ${corsOrigin}`)
}

void bootstrap()
