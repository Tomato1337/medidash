import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { Test } from "@nestjs/testing"
import {
	FastifyAdapter,
	NestFastifyApplication,
} from "@nestjs/platform-fastify"
import { ValidationPipe } from "@nestjs/common"
import request from "supertest"
import { HealthController } from "./health.controller"

describe("HealthController (integration)", () => {
	let app: NestFastifyApplication

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			controllers: [HealthController],
		}).compile()

		app = moduleRef.createNestApplication<NestFastifyApplication>(
			new FastifyAdapter(),
		)
		app.setGlobalPrefix("api")
		app.useGlobalPipes(
			new ValidationPipe({
				whitelist: true,
				transform: true,
			}),
		)
		await app.init()
		await app.getHttpAdapter().getInstance().ready()
	})

	afterAll(async () => {
		await app.close()
	})

	describe("GET /api/health", () => {
		it("должен вернуть статус сервиса", async () => {
			const response = await request(app.getHttpServer())
				.get("/api/health")
				.expect(200)

			expect(response.body.status).toBe("ok")
			expect(response.body.timestamp).toBeDefined()
			expect(response.body.uptime).toBeTypeOf("number")
		})
	})

	describe("GET /api/health/ping", () => {
		it("должен вернуть pong", async () => {
			const response = await request(app.getHttpServer())
				.get("/api/health/ping")
				.expect(200)

			expect(response.body).toEqual({ message: "pong" })
		})
	})
})
