import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest"
import { Test } from "@nestjs/testing"
import {
	FastifyAdapter,
	NestFastifyApplication,
} from "@nestjs/platform-fastify"
import { ValidationPipe } from "@nestjs/common"
import request from "supertest"
import { AuthController } from "./auth.controller"
import { AuthService } from "./auth.service"

describe("AuthController (integration)", () => {
	let app: NestFastifyApplication

	const mockAuthService = {
		register: vi.fn(),
		login: vi.fn(),
		signOut: vi.fn(),
	}

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			controllers: [AuthController],
			providers: [{ provide: AuthService, useValue: mockAuthService }],
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

	describe("POST /api/auth/register", () => {
		const validBody = {
			email: "test@example.com",
			name: "Test User",
			password: "strongPassword123",
		}

		const mockResponse = {
			user: {
				id: "user-1",
				email: "test@example.com",
				name: "Test User",
			},
			accessToken: "jwt-access-token",
		}

		it("должен зарегистрировать пользователя с валидными данными", async () => {
			mockAuthService.register.mockResolvedValue(mockResponse)

			const response = await request(app.getHttpServer())
				.post("/api/auth/register")
				.send(validBody)
				.expect(201)

			expect(response.body).toEqual(mockResponse)
			expect(mockAuthService.register).toHaveBeenCalledWith(
				validBody,
				expect.anything(),
			)
		})

		it("должен вернуть 400 при отсутствии email", async () => {
			const body = { name: "Test", password: "strongPassword123" }

			await request(app.getHttpServer())
				.post("/api/auth/register")
				.send(body)
				.expect(400)

			expect(mockAuthService.register).not.toHaveBeenCalled()
		})

		it("должен вернуть 400 при невалидном email", async () => {
			const body = {
				email: "not-an-email",
				name: "Test",
				password: "strongPassword123",
			}

			await request(app.getHttpServer())
				.post("/api/auth/register")
				.send(body)
				.expect(400)

			expect(mockAuthService.register).not.toHaveBeenCalled()
		})

		it("должен вернуть 400 при отсутствии name", async () => {
			const body = {
				email: "test@example.com",
				password: "strongPassword123",
			}

			await request(app.getHttpServer())
				.post("/api/auth/register")
				.send(body)
				.expect(400)

			expect(mockAuthService.register).not.toHaveBeenCalled()
		})

		it("должен вернуть 400 при пустом name", async () => {
			const body = {
				email: "test@example.com",
				name: "",
				password: "strongPassword123",
			}

			await request(app.getHttpServer())
				.post("/api/auth/register")
				.send(body)
				.expect(400)

			expect(mockAuthService.register).not.toHaveBeenCalled()
		})

		it("должен вернуть 400 при отсутствии password", async () => {
			const body = {
				email: "test@example.com",
				name: "Test User",
			}

			await request(app.getHttpServer())
				.post("/api/auth/register")
				.send(body)
				.expect(400)

			expect(mockAuthService.register).not.toHaveBeenCalled()
		})

		it("должен вернуть 400 при коротком password (менее 8 символов)", async () => {
			const body = {
				email: "test@example.com",
				name: "Test User",
				password: "short",
			}

			await request(app.getHttpServer())
				.post("/api/auth/register")
				.send(body)
				.expect(400)

			expect(mockAuthService.register).not.toHaveBeenCalled()
		})

		it("должен отклонить лишние поля в body (whitelist)", async () => {
			const body = {
				...validBody,
				role: "admin",
				isActive: true,
			}

			await request(app.getHttpServer())
				.post("/api/auth/register")
				.send(body)
				.expect(400)

			expect(mockAuthService.register).not.toHaveBeenCalled()
		})

		it("должен вернуть 400 при пустом body", async () => {
			await request(app.getHttpServer())
				.post("/api/auth/register")
				.send({})
				.expect(400)

			expect(mockAuthService.register).not.toHaveBeenCalled()
		})

		it("должен принять password ровно из 8 символов", async () => {
			const body = {
				email: "test@example.com",
				name: "Test",
				password: "12345678",
			}
			mockAuthService.register.mockResolvedValue(mockResponse)

			await request(app.getHttpServer())
				.post("/api/auth/register")
				.send(body)
				.expect(201)

			expect(mockAuthService.register).toHaveBeenCalled()
		})
	})
})
