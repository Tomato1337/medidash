import "tsconfig-paths/register"
import { NestFactory } from "@nestjs/core"
import {
	FastifyAdapter,
	NestFastifyApplication,
} from "@nestjs/platform-fastify"
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger"
import { AppModule } from "./app.module"
import { AuthModule } from "./auth/auth.module"
import { UserModule } from "./user/user.module"
import { HealthModule } from "./health/health.module"
import { SseModule } from "./sse/sse.module"
import { ValidationPipe, Logger } from "@nestjs/common"
import fastifyCookie from "@fastify/cookie"
import fastifyMultipart from "@fastify/multipart"
import { EnvService } from "./env/env.service"
import { SwaggerAggregatorService } from "./swagger/swagger.service"

async function bootstrap() {
	const logger = new Logger("Bootstrap")

	const app = await NestFactory.create<NestFastifyApplication>(
		AppModule,
		new FastifyAdapter({
			logger: process.env.NODE_ENV === "dev",
			bodyLimit: 104857600,
		}),
	)

	const envService = app.get(EnvService)
	const swaggerAggregator = app.get(SwaggerAggregatorService)
	const port = envService.get("API_GATEWAY_PORT")
	const corsOrigin = envService.get("CORS_ORIGIN")
	const nodeEnv = envService.get("NODE_ENV")

	const gatewayConfig = new DocumentBuilder()
		.setTitle("Health Helper API")
		.setDescription(
			"Unified API documentation for all Health Helper microservices",
		)
		.setVersion("1.0")
		.addBearerAuth()
		.build()

	await app.register(fastifyCookie as any)
	await app.register(fastifyMultipart, {
		limits: {
			fileSize: 50 * 1024 * 1024,
			files: 10,
		},
	})

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
			transformOptions: {
				enableImplicitConversion: true,
			},
		}),
	)

	// Generate API Gateway's own OpenAPI spec (only auth, users, health, sse)
	const gatewayDocument = SwaggerModule.createDocument(app, gatewayConfig, {
		include: [AuthModule, UserModule, HealthModule, SseModule],
	})

	// Aggregate specs from all microservices
	try {
		const aggregatedSpec = await swaggerAggregator.aggregateSpecs()

		// Merge gateway's own endpoints into aggregated spec
		if (gatewayDocument.paths && aggregatedSpec.paths) {
			Object.assign(aggregatedSpec.paths, gatewayDocument.paths)
		}
		if (
			gatewayDocument.components?.schemas &&
			aggregatedSpec.components?.schemas
		) {
			Object.assign(
				aggregatedSpec.components.schemas,
				gatewayDocument.components.schemas,
			)
		}

		// Setup Swagger UI with aggregated spec
		SwaggerModule.setup("api/docs", app, aggregatedSpec, {
			jsonDocumentUrl: "api/docs/json",
		})
		logger.log(
			`📚 Unified Swagger includes ${swaggerAggregator.getServices().length} microservices`,
		)
	} catch {
		logger.error(
			"Failed to aggregate Swagger specs, using gateway-only docs",
		)
		SwaggerModule.setup("api/docs", app, gatewayDocument)
	}

	await app.listen(port, "0.0.0.0")

	logger.log(`🚀 API Gateway started on http://0.0.0.0:${port}`)
	logger.log(`📚 Swagger docs available at http://0.0.0.0:${port}/api/docs`)
	logger.log(`🌍 Environment: ${nodeEnv}`)
	logger.log(`🔗 CORS enabled for: ${corsOrigin}`)
}

void bootstrap()
