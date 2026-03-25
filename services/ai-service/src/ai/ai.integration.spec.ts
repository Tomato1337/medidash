import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import { Test } from "@nestjs/testing"
import {
	FastifyAdapter,
	NestFastifyApplication,
} from "@nestjs/platform-fastify"
import { ValidationPipe } from "@nestjs/common"
import request from "supertest"
import { AiController } from "./ai.controller"
import { AiService } from "./ai.service"
import { AnonymizationService } from "../anonymization/anonymization.service"

describe("AiController (integration)", () => {
	let app: NestFastifyApplication

	const mockAiService = {
		generateEmbedding: vi.fn(),
		generateSummary: vi.fn(),
		anonymize: vi.fn(),
		processDocument: vi.fn(),
	}

	const mockAnonymizationService = {
		healthCheck: vi.fn(),
	}

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			controllers: [AiController],
			providers: [
				{ provide: AiService, useValue: mockAiService },
				{
					provide: AnonymizationService,
					useValue: mockAnonymizationService,
				},
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

	// ─── POST /api/ai/embeddings ─────────────────────────────────────────

	describe("POST /api/ai/embeddings", () => {
		it("должен вернуть эмбеддинг для текста", async () => {
			mockAiService.generateEmbedding.mockResolvedValue({
				embedding: [0.1, 0.2, 0.3],
				tokensUsed: 10,
			})

			const response = await request(app.getHttpServer())
				.post("/api/ai/embeddings")
				.send({ text: "Тестовый медицинский текст" })
				.expect(200)

			expect(response.body).toEqual({
				embedding: [0.1, 0.2, 0.3],
				tokensUsed: 10,
			})
			expect(mockAiService.generateEmbedding).toHaveBeenCalledWith(
				"Тестовый медицинский текст",
			)
		})

		it("должен вернуть 400 для пустого текста", async () => {
			const response = await request(app.getHttpServer())
				.post("/api/ai/embeddings")
				.send({ text: "" })
				.expect(400)

			expect(response.body.message).toEqual(
				expect.arrayContaining([
					expect.stringContaining("text should not be empty"),
				]),
			)
		})

		it("должен вернуть 400 без поля text", async () => {
			await request(app.getHttpServer())
				.post("/api/ai/embeddings")
				.send({})
				.expect(400)
		})

		it("должен вернуть 400 для неизвестных полей", async () => {
			await request(app.getHttpServer())
				.post("/api/ai/embeddings")
				.send({ text: "валидный текст", unknownField: 123 })
				.expect(400)
		})
	})

	// ─── POST /api/ai/embeddings/batch ───────────────────────────────────

	describe("POST /api/ai/embeddings/batch", () => {
		it("должен вернуть эмбеддинги для нескольких текстов", async () => {
			mockAiService.generateEmbedding
				.mockResolvedValueOnce({ embedding: [0.1], tokensUsed: 5 })
				.mockResolvedValueOnce({ embedding: [0.2], tokensUsed: 5 })

			const response = await request(app.getHttpServer())
				.post("/api/ai/embeddings/batch")
				.send({ texts: ["Текст 1", "Текст 2"] })
				.expect(200)

			expect(response.body).toEqual({
				embeddings: [[0.1], [0.2]],
				tokensUsed: 10,
			})
		})

		it("должен вернуть 400 для пустого массива текстов", async () => {
			await request(app.getHttpServer())
				.post("/api/ai/embeddings/batch")
				.send({ texts: [] })
				.expect(400)
		})
	})

	// ─── POST /api/ai/summary ────────────────────────────────────────────

	describe("POST /api/ai/summary", () => {
		it("должен вернуть саммари для текста", async () => {
			mockAiService.generateSummary.mockResolvedValue({
				summary: "Тестовое резюме документа",
				title: "Заголовок",
				report: "Отчёт",
				tags: [],
				tokensUsed: 50,
			})

			const response = await request(app.getHttpServer())
				.post("/api/ai/summary")
				.send({ text: "Длинный медицинский документ для анализа" })
				.expect(200)

			expect(response.body.summary).toBe("Тестовое резюме документа")
			expect(response.body.tokensUsed).toBe(50)
			expect(mockAiService.generateSummary).toHaveBeenCalledWith(
				"Длинный медицинский документ для анализа",
			)
		})

		it("должен вернуть 400 для пустого текста", async () => {
			await request(app.getHttpServer())
				.post("/api/ai/summary")
				.send({ text: "" })
				.expect(400)
		})
	})

	// ─── POST /api/ai/anonymize ──────────────────────────────────────────

	describe("POST /api/ai/anonymize", () => {
		it("должен вернуть анонимизированный текст", async () => {
			mockAiService.anonymize.mockResolvedValue({
				anonymizedText: "Пациент [ИМЯ_1] обратился с жалобами...",
				piiMappings: [
					{
						original: "Иванов Иван",
						replacement: "[ИМЯ_1]",
						type: "NAME",
					},
				],
			})

			const response = await request(app.getHttpServer())
				.post("/api/ai/anonymize")
				.send({ text: "Пациент Иванов Иван обратился с жалобами..." })
				.expect(200)

			expect(response.body.anonymizedText).toBe(
				"Пациент [ИМЯ_1] обратился с жалобами...",
			)
			expect(response.body.piiMappings).toHaveLength(1)
			expect(response.body.piiMappings[0].type).toBe("NAME")
		})

		it("должен вернуть 400 для пустого текста", async () => {
			await request(app.getHttpServer())
				.post("/api/ai/anonymize")
				.send({ text: "" })
				.expect(400)
		})
	})

	// ─── POST /api/ai/process ────────────────────────────────────────────

	describe("POST /api/ai/process", () => {
		it("должен обработать документ полностью", async () => {
			mockAiService.processDocument.mockResolvedValue({
				chunks: [
					{
						anonymizedText: "Анонимизированный текст чанка",
						embedding: [0.1, 0.2, 0.3],
						piiMappings: [],
					},
				],
				summary: "Резюме документа",
				title: "Заголовок документа",
				report: "Подробный отчёт",
				tags: [
					{
						name: "Анализы",
						description: "Лабораторные анализы",
						color: "#3B82F6",
						isSystem: true,
					},
				],
				tokensUsed: 100,
			})

			const response = await request(app.getHttpServer())
				.post("/api/ai/process")
				.send({ chunks: ["Текст чанка документа"] })
				.expect(200)

			expect(response.body.summary).toBe("Резюме документа")
			expect(response.body.title).toBe("Заголовок документа")
			expect(response.body.chunks).toHaveLength(1)
			expect(response.body.tags).toHaveLength(1)
			expect(response.body.tokensUsed).toBe(100)
		})

		it("должен вернуть 400 для пустого массива чанков", async () => {
			await request(app.getHttpServer())
				.post("/api/ai/process")
				.send({ chunks: [] })
				.expect(400)
		})
	})

	// ─── GET /api/ai/health ──────────────────────────────────────────────

	describe("GET /api/ai/health", () => {
		it("должен вернуть статус AI сервисов", async () => {
			mockAnonymizationService.healthCheck.mockResolvedValue(true)

			const response = await request(app.getHttpServer())
				.get("/api/ai/health")
				.expect(200)

			expect(response.body).toEqual({
				status: "ok",
				geminiAvailable: true,
				anonymizerAvailable: true,
			})
		})

		it("должен показать anonymizer недоступен", async () => {
			mockAnonymizationService.healthCheck.mockResolvedValue(false)

			const response = await request(app.getHttpServer())
				.get("/api/ai/health")
				.expect(200)

			expect(response.body.anonymizerAvailable).toBe(false)
		})
	})
})
