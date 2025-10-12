import { NestFactory } from "@nestjs/core"
import {
	FastifyAdapter,
	NestFastifyApplication,
} from "@nestjs/platform-fastify"
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

	await app.register(fastifyCookie as any)
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			transform: true,
		}),
	)

	await app.listen(process.env.PORT ?? 3000, "0.0.0.0")
}

void bootstrap()
