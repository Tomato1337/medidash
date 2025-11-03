import { NestFactory } from "@nestjs/core"
import {
	FastifyAdapter,
	NestFastifyApplication,
} from "@nestjs/platform-fastify"
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger"
import { AppModule } from "./app.module"
import { ValidationPipe } from "@nestjs/common"
import fastifyCookie from "@fastify/cookie"

async function bootstrap() {
	const app = await NestFactory.create<NestFastifyApplication>(
		AppModule,
		new FastifyAdapter({
			logger: true,
		}),
	)

	const config = new DocumentBuilder()
		.setTitle("Health Helper")
		.setDescription("The Health Helper API description")
		.setVersion("1.0")
		.addTag("health")
		.build()

	await app.register(fastifyCookie as any)

	app.setGlobalPrefix("api", {
		exclude: [],
	})

	app.enableCors({
		origin: "http://localhost:5173",
		methods: "GET,POST,PUT,DELETE",
		credentials: true,
		allowedHeaders: "Content-Type, Authorization",
	})

	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			transform: true,
		}),
	)

	const documentFactory = () => SwaggerModule.createDocument(app, config)
	SwaggerModule.setup("api/docs", app, documentFactory)
	await app.listen(process.env.PORT ?? 3000, "0.0.0.0")
}

void bootstrap()
