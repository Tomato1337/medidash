import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import { Test } from "@nestjs/testing"
import {
	FastifyAdapter,
	NestFastifyApplication,
} from "@nestjs/platform-fastify"
import { ValidationPipe } from "@nestjs/common"
import request from "supertest"
import { RecordsController } from "./records.controller"
import { RecordsService } from "./records.service"

const TEST_USER_ID = "user-integration-test-123"
const TEST_RECORD_ID = "550e8400-e29b-41d4-a716-446655440000"

const mockRecordResponse = {
	id: TEST_RECORD_ID,
	userId: TEST_USER_ID,
	title: "Анализы за январь 2024",
	description: "Результаты общего анализа крови",
	date: "2024-01-15T00:00:00.000Z",
	summary: null,
	createdAt: "2024-01-15T10:00:00.000Z",
	updatedAt: "2024-01-15T10:00:00.000Z",
	status: "COMPLETED",
	failedPhase: null,
	documents: [],
	tags: [],
	documentCount: 0,
}

describe("RecordsController (integration)", () => {
	let app: NestFastifyApplication

	const mockRecordsService = {
		createRecord: vi.fn(),
		getUserRecords: vi.fn(),
		getRecordById: vi.fn(),
		updateRecord: vi.fn(),
		deleteRecord: vi.fn(),
	}

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			controllers: [RecordsController],
			providers: [
				{ provide: RecordsService, useValue: mockRecordsService },
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

	// ─── POST /api/records ───────────────────────────────────────────────

	describe("POST /api/records", () => {
		const validDto = {
			recordId: TEST_RECORD_ID,
			title: "Анализы за январь 2024",
			description: "Результаты общего анализа крови",
		}

		it("должен создать запись с x-user-id", async () => {
			mockRecordsService.createRecord.mockResolvedValue(
				mockRecordResponse,
			)

			const response = await request(app.getHttpServer())
				.post("/api/records")
				.set("x-user-id", TEST_USER_ID)
				.send(validDto)
				.expect(201)

			expect(response.body.id).toBe(TEST_RECORD_ID)
			expect(response.body.title).toBe("Анализы за январь 2024")
			expect(mockRecordsService.createRecord).toHaveBeenCalledWith(
				TEST_USER_ID,
				expect.objectContaining({
					recordId: TEST_RECORD_ID,
					title: "Анализы за январь 2024",
				}),
			)
		})

		it("должен вернуть 401 без x-user-id", async () => {
			await request(app.getHttpServer())
				.post("/api/records")
				.send(validDto)
				.expect(401)
		})

		it("должен вернуть 400 без обязательных полей", async () => {
			await request(app.getHttpServer())
				.post("/api/records")
				.set("x-user-id", TEST_USER_ID)
				.send({})
				.expect(400)
		})

		it("должен вернуть 400 для невалидного UUID recordId", async () => {
			await request(app.getHttpServer())
				.post("/api/records")
				.set("x-user-id", TEST_USER_ID)
				.send({ recordId: "not-a-uuid", title: "Тест" })
				.expect(400)
		})

		it("должен вернуть 400 для слишком длинного title", async () => {
			await request(app.getHttpServer())
				.post("/api/records")
				.set("x-user-id", TEST_USER_ID)
				.send({
					recordId: TEST_RECORD_ID,
					title: "A".repeat(256),
				})
				.expect(400)
		})
	})

	// ─── GET /api/records ────────────────────────────────────────────────

	describe("GET /api/records", () => {
		it("должен вернуть список записей пользователя", async () => {
			mockRecordsService.getUserRecords.mockResolvedValue({
				data: [mockRecordResponse],
				page: 1,
				limit: 10,
				total: 1,
			})

			const response = await request(app.getHttpServer())
				.get("/api/records")
				.set("x-user-id", TEST_USER_ID)
				.expect(200)

			expect(response.body.data).toHaveLength(1)
			expect(response.body.page).toBe(1)
			expect(response.body.total).toBe(1)
		})

		it("должен вернуть 401 без x-user-id", async () => {
			await request(app.getHttpServer())
				.get("/api/records")
				.expect(401)
		})

		it("должен передать параметры пагинации в сервис", async () => {
			mockRecordsService.getUserRecords.mockResolvedValue({
				data: [],
				page: 2,
				limit: 5,
				total: 0,
			})

			await request(app.getHttpServer())
				.get("/api/records?page=2&limit=5")
				.set("x-user-id", TEST_USER_ID)
				.expect(200)

			expect(mockRecordsService.getUserRecords).toHaveBeenCalledWith(
				TEST_USER_ID,
				expect.objectContaining({ page: 2, limit: 5 }),
			)
		})
	})

	// ─── GET /api/records/:id ────────────────────────────────────────────

	describe("GET /api/records/:id", () => {
		it("должен вернуть запись по ID", async () => {
			mockRecordsService.getRecordById.mockResolvedValue(
				mockRecordResponse,
			)

			const response = await request(app.getHttpServer())
				.get(`/api/records/${TEST_RECORD_ID}`)
				.set("x-user-id", TEST_USER_ID)
				.expect(200)

			expect(response.body.id).toBe(TEST_RECORD_ID)
			expect(mockRecordsService.getRecordById).toHaveBeenCalledWith(
				TEST_RECORD_ID,
				TEST_USER_ID,
			)
		})

		it("должен вернуть 401 без x-user-id", async () => {
			await request(app.getHttpServer())
				.get(`/api/records/${TEST_RECORD_ID}`)
				.expect(401)
		})
	})

	// ─── PUT /api/records/:id ────────────────────────────────────────────

	describe("PUT /api/records/:id", () => {
		it("должен обновить запись", async () => {
			const updatedRecord = {
				...mockRecordResponse,
				title: "Обновлённый заголовок",
			}
			mockRecordsService.updateRecord.mockResolvedValue(updatedRecord)

			const response = await request(app.getHttpServer())
				.put(`/api/records/${TEST_RECORD_ID}`)
				.set("x-user-id", TEST_USER_ID)
				.send({ title: "Обновлённый заголовок" })
				.expect(200)

			expect(response.body.title).toBe("Обновлённый заголовок")
			expect(mockRecordsService.updateRecord).toHaveBeenCalledWith(
				TEST_RECORD_ID,
				TEST_USER_ID,
				expect.objectContaining({ title: "Обновлённый заголовок" }),
			)
		})

		it("должен вернуть 401 без x-user-id", async () => {
			await request(app.getHttpServer())
				.put(`/api/records/${TEST_RECORD_ID}`)
				.send({ title: "Тест" })
				.expect(401)
		})
	})

	// ─── DELETE /api/records/:id ─────────────────────────────────────────

	describe("DELETE /api/records/:id", () => {
		it("должен удалить запись", async () => {
			mockRecordsService.deleteRecord.mockResolvedValue(undefined)

			await request(app.getHttpServer())
				.delete(`/api/records/${TEST_RECORD_ID}`)
				.set("x-user-id", TEST_USER_ID)
				.expect(200)

			expect(mockRecordsService.deleteRecord).toHaveBeenCalledWith(
				TEST_RECORD_ID,
				TEST_USER_ID,
			)
		})

		it("должен вернуть 401 без x-user-id", async () => {
			await request(app.getHttpServer())
				.delete(`/api/records/${TEST_RECORD_ID}`)
				.expect(401)
		})
	})
})
