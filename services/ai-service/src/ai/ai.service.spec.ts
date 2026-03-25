import { Test, TestingModule } from "@nestjs/testing"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AiService } from "./ai.service"
import { GeminiService } from "../gemini/gemini.service"
import { AnonymizationService } from "../anonymization/anonymization.service"

describe("AiService", () => {
	let service: AiService

	const geminiServiceMock = {
		generateEmbedding: vi.fn(),
		generateSummary: vi.fn(),
	}

	const anonymizationServiceMock = {
		anonymize: vi.fn(),
		ocr: vi.fn(),
	}

	beforeEach(async () => {
		vi.clearAllMocks()

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				AiService,
				{
					provide: GeminiService,
					useValue: geminiServiceMock,
				},
				{
					provide: AnonymizationService,
					useValue: anonymizationServiceMock,
				},
			],
		}).compile()

		service = module.get<AiService>(AiService)
	})

	describe("processChunk", () => {
		it("should anonymize text and generate embedding", async () => {
			// Arrange
			anonymizationServiceMock.anonymize.mockResolvedValue({
				anonymizedText: "Пациент [NAME]",
				piiMappings: [
					{
						original: "Иван Иванов",
						replacement: "[NAME]",
						type: "NAME",
					},
				],
			})
			geminiServiceMock.generateEmbedding.mockResolvedValue({
				embedding: [0.1, 0.2, 0.3],
				tokensUsed: 10,
			})

			// Act
			const result = await service.processChunk("Пациент Иван Иванов")

			// Assert
			expect(anonymizationServiceMock.anonymize).toHaveBeenCalledWith(
				"Пациент Иван Иванов",
			)
			expect(geminiServiceMock.generateEmbedding).toHaveBeenCalledWith(
				"Пациент [NAME]",
			)
			expect(result).toEqual({
				anonymizedText: "Пациент [NAME]",
				embedding: [0.1, 0.2, 0.3],
				piiMappings: [
					{
						original: "Иван Иванов",
						replacement: "[NAME]",
						type: "NAME",
					},
				],
			})
		})

		it("should propagate Gemini errors", async () => {
			// Arrange
			anonymizationServiceMock.anonymize.mockResolvedValue({
				anonymizedText: "Текст [NAME]",
				piiMappings: [],
			})
			geminiServiceMock.generateEmbedding.mockRejectedValue(
				new Error("Gemini API unavailable"),
			)

			// Act
			const call = service.processChunk("Текст")

			// Assert
			await expect(call).rejects.toThrow("Gemini API unavailable")
		})
	})

	describe("processChunks", () => {
		it("should process chunks sequentially", async () => {
			// Arrange
			const processChunkSpy = vi
				.spyOn(service, "processChunk")
				.mockResolvedValueOnce({
					anonymizedText: "chunk-1-anon",
					embedding: [1],
					piiMappings: [],
				})
				.mockResolvedValueOnce({
					anonymizedText: "chunk-2-anon",
					embedding: [2],
					piiMappings: [],
				})

			// Act
			const result = await service.processChunks(["chunk-1", "chunk-2"])

			// Assert
			expect(processChunkSpy).toHaveBeenNthCalledWith(1, "chunk-1")
			expect(processChunkSpy).toHaveBeenNthCalledWith(2, "chunk-2")
			expect(result).toEqual([
				{
					anonymizedText: "chunk-1-anon",
					embedding: [1],
					piiMappings: [],
				},
				{
					anonymizedText: "chunk-2-anon",
					embedding: [2],
					piiMappings: [],
				},
			])
		})

		it("should handle large number of chunks", async () => {
			// Arrange
			const chunks = Array.from({ length: 50 }, (_, index) => `chunk-${index}`)
			vi.spyOn(service, "processChunk").mockImplementation(async (text) => ({
				anonymizedText: `${text}-anon`,
				embedding: [0.5],
				piiMappings: [],
			}))

			// Act
			const result = await service.processChunks(chunks)

			// Assert
			expect(result).toHaveLength(50)
		})
	})

	describe("processDocument", () => {
		it("should process all chunks and generate summary", async () => {
			// Arrange
			vi.spyOn(service, "processChunks").mockResolvedValue([
				{
					anonymizedText: "anon-1",
					embedding: [0.1],
					piiMappings: [],
				},
				{
					anonymizedText: "anon-2",
					embedding: [0.2],
					piiMappings: [],
				},
			])

			geminiServiceMock.generateSummary.mockResolvedValue({
				title: "Резюме",
				summary: "Краткое описание",
				report: "Полный отчёт",
				tags: [
					{
						name: "Терапия",
						description: "Терапевтические документы",
						color: "#3B82F6",
						isSystem: true,
					},
				],
				tokensUsed: 120,
			})

			// Act
			const result = await service.processDocument(["chunk-1", "chunk-2"])

			// Assert
			expect(geminiServiceMock.generateSummary).toHaveBeenCalledWith(
				"anon-1\n\nanon-2",
			)
			expect(result).toEqual({
				chunks: [
					{
						anonymizedText: "anon-1",
						embedding: [0.1],
						piiMappings: [],
					},
					{
						anonymizedText: "anon-2",
						embedding: [0.2],
						piiMappings: [],
					},
				],
				summary: "Краткое описание",
				title: "Резюме",
				report: "Полный отчёт",
				tags: [
					{
						name: "Терапия",
						description: "Терапевтические документы",
						color: "#3B82F6",
						isSystem: true,
					},
				],
				tokensUsed: 120,
			})
		})

		it("should propagate summary generation errors", async () => {
			// Arrange
			vi.spyOn(service, "processChunks").mockResolvedValue([
				{
					anonymizedText: "anon-1",
					embedding: [0.1],
					piiMappings: [],
				},
			])
			geminiServiceMock.generateSummary.mockRejectedValue(
				new Error("Gemini summary failed"),
			)

			// Act
			const call = service.processDocument(["chunk-1"])

			// Assert
			await expect(call).rejects.toThrow("Gemini summary failed")
		})
	})

	describe("delegating methods", () => {
		it("should delegate generateEmbedding to GeminiService", async () => {
			// Arrange
			geminiServiceMock.generateEmbedding.mockResolvedValue({
				embedding: [1, 2, 3],
				tokensUsed: 20,
			})

			// Act
			const result = await service.generateEmbedding("anon-text")

			// Assert
			expect(geminiServiceMock.generateEmbedding).toHaveBeenCalledWith(
				"anon-text",
			)
			expect(result).toEqual({ embedding: [1, 2, 3], tokensUsed: 20 })
		})

		it("should delegate anonymize to AnonymizationService", async () => {
			// Arrange
			anonymizationServiceMock.anonymize.mockResolvedValue({
				anonymizedText: "[NAME]",
				piiMappings: [],
			})

			// Act
			const result = await service.anonymize("Иван")

			// Assert
			expect(anonymizationServiceMock.anonymize).toHaveBeenCalledWith("Иван")
			expect(result).toEqual({ anonymizedText: "[NAME]", piiMappings: [] })
		})

		it("should delegate OCR to AnonymizationService", async () => {
			// Arrange
			const imageBuffer = Buffer.from("image-bytes")
			anonymizationServiceMock.ocr.mockResolvedValue({
				text: "Распознанный текст",
				confidence: 0.92,
				language: "ru",
			})

			// Act
			const result = await service.extractTextFromImage(imageBuffer, "image/png")

			// Assert
			expect(anonymizationServiceMock.ocr).toHaveBeenCalledWith(
				imageBuffer,
				"image/png",
			)
			expect(result).toEqual({
				text: "Распознанный текст",
				confidence: 0.92,
			})
		})
	})
})
