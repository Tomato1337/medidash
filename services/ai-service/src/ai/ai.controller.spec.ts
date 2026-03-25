import { Test, TestingModule } from "@nestjs/testing"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { validate } from "class-validator"
import { plainToInstance } from "class-transformer"
import { AiController } from "./ai.controller"
import { AiService } from "./ai.service"
import { AnonymizationService } from "../anonymization/anonymization.service"
import {
	EmbeddingRequestDto,
	EmbeddingsBatchRequestDto,
	SummaryRequestDto,
	AnonymizeRequestDto,
	ProcessChunksRequestDto,
} from "./dto/ai.dto"

describe("AiController", () => {
	let controller: AiController

	const aiServiceMock = {
		generateEmbedding: vi.fn(),
		generateSummary: vi.fn(),
		anonymize: vi.fn(),
		processDocument: vi.fn(),
	}

	const anonymizationServiceMock = {
		healthCheck: vi.fn(),
	}

	beforeEach(async () => {
		vi.clearAllMocks()

		const module: TestingModule = await Test.createTestingModule({
			controllers: [AiController],
			providers: [
				{
					provide: AiService,
					useValue: aiServiceMock,
				},
				{
					provide: AnonymizationService,
					useValue: anonymizationServiceMock,
				},
			],
		}).compile()

		controller = module.get<AiController>(AiController)
	})

	describe("generateEmbedding", () => {
		it("should delegate to aiService.generateEmbedding", async () => {
			// Arrange
			aiServiceMock.generateEmbedding.mockResolvedValue({
				embedding: [0.1, 0.2],
				tokensUsed: 10,
			})

			// Act
			const result = await controller.generateEmbedding({ text: "anon text" })

			// Assert
			expect(aiServiceMock.generateEmbedding).toHaveBeenCalledWith("anon text")
			expect(result).toEqual({ embedding: [0.1, 0.2], tokensUsed: 10 })
		})
	})

	describe("generateEmbeddingsBatch", () => {
		it("should generate embeddings for all texts and sum tokens", async () => {
			// Arrange
			aiServiceMock.generateEmbedding
				.mockResolvedValueOnce({ embedding: [1], tokensUsed: 5 })
				.mockResolvedValueOnce({ embedding: [2], tokensUsed: 7 })

			// Act
			const result = await controller.generateEmbeddingsBatch({
				texts: ["text-1", "text-2"],
			})

			// Assert
			expect(aiServiceMock.generateEmbedding).toHaveBeenCalledTimes(2)
			expect(result).toEqual({
				embeddings: [[1], [2]],
				tokensUsed: 12,
			})
		})
	})

	describe("generateSummary", () => {
		it("should delegate to aiService.generateSummary", async () => {
			// Arrange
			aiServiceMock.generateSummary.mockResolvedValue({
				title: "Заголовок",
				summary: "Резюме",
				report: "Отчёт",
				tags: [],
				tokensUsed: 100,
			})

			// Act
			const result = await controller.generateSummary({ text: "doc text" })

			// Assert
			expect(aiServiceMock.generateSummary).toHaveBeenCalledWith("doc text")
			expect(result.tokensUsed).toBe(100)
		})
	})

	describe("anonymize", () => {
		it("should delegate to aiService.anonymize", async () => {
			// Arrange
			aiServiceMock.anonymize.mockResolvedValue({
				anonymizedText: "Пациент [NAME]",
				piiMappings: [],
			})

			// Act
			const result = await controller.anonymize({ text: "Пациент Иван" })

			// Assert
			expect(aiServiceMock.anonymize).toHaveBeenCalledWith("Пациент Иван")
			expect(result.anonymizedText).toBe("Пациент [NAME]")
		})
	})

	describe("processDocument", () => {
		it("should delegate to aiService.processDocument", async () => {
			// Arrange
			aiServiceMock.processDocument.mockResolvedValue({
				chunks: [],
				title: "title",
				summary: "summary",
				report: "report",
				tags: [],
				tokensUsed: 42,
			})

			// Act
			const result = await controller.processDocument({
				chunks: ["chunk-a", "chunk-b"],
			})

			// Assert
			expect(aiServiceMock.processDocument).toHaveBeenCalledWith([
				"chunk-a",
				"chunk-b",
			])
			expect(result.tokensUsed).toBe(42)
		})
	})

	describe("healthCheck", () => {
		it("should return health status with anonymizer availability", async () => {
			// Arrange
			anonymizationServiceMock.healthCheck.mockResolvedValue(true)

			// Act
			const result = await controller.healthCheck()

			// Assert
			expect(anonymizationServiceMock.healthCheck).toHaveBeenCalledTimes(1)
			expect(result).toEqual({
				status: "ok",
				geminiAvailable: true,
				anonymizerAvailable: true,
			})
		})
	})
})

describe("Ai DTO validation", () => {
	it("should fail EmbeddingRequestDto validation for empty text", async () => {
		// Arrange
		const dto = plainToInstance(EmbeddingRequestDto, { text: "" })

		// Act
		const errors = await validate(dto)

		// Assert
		expect(errors.length).toBeGreaterThan(0)
	})

	it("should fail EmbeddingsBatchRequestDto validation for empty array", async () => {
		// Arrange
		const dto = plainToInstance(EmbeddingsBatchRequestDto, { texts: [] })

		// Act
		const errors = await validate(dto)

		// Assert
		expect(errors.length).toBeGreaterThan(0)
	})

	it("should fail SummaryRequestDto validation for non-string text", async () => {
		// Arrange
		const dto = plainToInstance(SummaryRequestDto, { text: 123 })

		// Act
		const errors = await validate(dto)

		// Assert
		expect(errors.length).toBeGreaterThan(0)
	})

	it("should fail AnonymizeRequestDto validation for missing text", async () => {
		// Arrange
		const dto = plainToInstance(AnonymizeRequestDto, {})

		// Act
		const errors = await validate(dto)

		// Assert
		expect(errors.length).toBeGreaterThan(0)
	})

	it("should fail ProcessChunksRequestDto validation for non-string items", async () => {
		// Arrange
		const dto = plainToInstance(ProcessChunksRequestDto, {
			chunks: ["ok", 42],
		})

		// Act
		const errors = await validate(dto)

		// Assert
		expect(errors.length).toBeGreaterThan(0)
	})
})
