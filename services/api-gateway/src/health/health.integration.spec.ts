import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest"
import { Test } from "@nestjs/testing"
import {
	FastifyAdapter,
	NestFastifyApplication,
} from "@nestjs/platform-fastify"
import { ValidationPipe } from "@nestjs/common"
import request from "supertest"
import { HealthController } from "./health.controller"
import { HttpClientService } from "../common/http-client.service"

describe("HealthController (integration)", () => {
	let app: NestFastifyApplication

	const mockHttpClient = {
		getServices: vi.fn(),
		checkHealth: vi.fn(),
	}

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			controllers: [HealthController],
			providers: [
				{ provide: HttpClientService, useValue: mockHttpClient },
			],
		}).compile()

		app = moduleRef.createNestApplication<NestFastifyApplication>(
			new FastifyAdapter(),
		)
		app.setGlobalPrefix("api")
		app.useGlobalPipes(
			new ValidationPipe({
				whitelist: true,
				transform: true,
				forbidNonWhitelisted: true,
			}),
		)
		await app.init()
		await app.getHttpAdapter().getInstance().ready()
	})

	afterAll(async () => {
		await app.close()
	})

	beforeEach(() => {
		vi.resetAllMocks()
	})

	describe("GET /api/health", () => {
		it("должен вернуть ok когда все сервисы здоровы", async () => {
			mockHttpClient.getServices.mockReturnValue([
				{ name: "document", baseUrl: "http://localhost:3001" },
				{ name: "processing", baseUrl: "http://localhost:3002" },
				{ name: "ai", baseUrl: "http://localhost:3003" },
			])
			mockHttpClient.checkHealth.mockResolvedValue(true)

			const response = await request(app.getHttpServer())
				.get("/api/health")
				.expect(200)

			expect(response.body.status).toBe("ok")
			expect(response.body.timestamp).toBeDefined()
			expect(response.body.uptime).toBeTypeOf("number")
			expect(response.body.services).toHaveLength(3)
			expect(
				response.body.services.every(
					(s: { status: string }) => s.status === "healthy",
				),
			).toBe(true)
		})

		it("должен вернуть degraded когда часть сервисов недоступна", async () => {
			mockHttpClient.getServices.mockReturnValue([
				{ name: "document", baseUrl: "http://localhost:3001" },
				{ name: "ai", baseUrl: "http://localhost:3003" },
			])
			mockHttpClient.checkHealth
				.mockResolvedValueOnce(true)
				.mockResolvedValueOnce(false)

			const response = await request(app.getHttpServer())
				.get("/api/health")
				.expect(200)

			expect(response.body.status).toBe("degraded")
			expect(response.body.services[0].status).toBe("healthy")
			expect(response.body.services[1].status).toBe("unhealthy")
		})

		it("должен вернуть down когда все сервисы недоступны", async () => {
			mockHttpClient.getServices.mockReturnValue([
				{ name: "document", baseUrl: "http://localhost:3001" },
				{ name: "ai", baseUrl: "http://localhost:3003" },
			])
			mockHttpClient.checkHealth.mockResolvedValue(false)

			const response = await request(app.getHttpServer())
				.get("/api/health")
				.expect(200)

			expect(response.body.status).toBe("down")
			expect(
				response.body.services.every(
					(s: { status: string }) => s.status === "unhealthy",
				),
			).toBe(true)
		})

		it("должен вернуть ok при пустом списке сервисов", async () => {
			mockHttpClient.getServices.mockReturnValue([])

			const response = await request(app.getHttpServer())
				.get("/api/health")
				.expect(200)

			expect(response.body.status).toBe("ok")
			expect(response.body.services).toHaveLength(0)
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
