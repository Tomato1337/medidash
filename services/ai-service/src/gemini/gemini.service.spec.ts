import { Test, TestingModule } from "@nestjs/testing"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { GeminiService } from "./gemini.service"
import { EnvService } from "../env/env.service"

const { embedContentMock, generateContentMock, getGenerativeModelMock } =
	vi.hoisted(() => {
		const localEmbedContentMock = vi.fn()
		const localGenerateContentMock = vi.fn()
		const localGetGenerativeModelMock = vi.fn((config: { model: string }) => {
			if (config.model === "gemini-embedding-001") {
				return {
					embedContent: localEmbedContentMock,
				}
			}

			return {
				generateContent: localGenerateContentMock,
			}
		})

		return {
			embedContentMock: localEmbedContentMock,
			generateContentMock: localGenerateContentMock,
			getGenerativeModelMock: localGetGenerativeModelMock,
		}
	})

vi.mock("@google/generative-ai", () => {
	function GoogleGenerativeAI(this: { getGenerativeModel: typeof getGenerativeModelMock }) {
		this.getGenerativeModel = getGenerativeModelMock
	}

	return {
		GoogleGenerativeAI,
	}
})

describe("GeminiService", () => {
	let service: GeminiService

	const envServiceMock = {
		get: vi.fn((key: string) => {
			if (key === "GEMINI_API_KEY") {
				return "dummy"
			}
			if (key === "GEMINI_RATE_LIMIT_DELAY_MS") {
				return 0
			}
			return undefined
		}),
	}

	beforeEach(async () => {
		vi.clearAllMocks()

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				GeminiService,
				{
					provide: EnvService,
					useValue: envServiceMock,
				},
			],
		}).compile()

		service = module.get<GeminiService>(GeminiService)
		await service.onModuleInit()
	})

	describe("onModuleInit", () => {
		it("should initialize Gemini client and models", async () => {
			// Arrange
			const freshModule: TestingModule = await Test.createTestingModule({
				providers: [
					GeminiService,
					{
						provide: EnvService,
						useValue: envServiceMock,
					},
				],
			}).compile()
			const freshService = freshModule.get<GeminiService>(GeminiService)

			// Act
			await freshService.onModuleInit()

			// Assert
			expect(envServiceMock.get).toHaveBeenCalledWith("GEMINI_API_KEY")
			expect(getGenerativeModelMock).toHaveBeenCalledWith({
				model: "gemini-embedding-001",
			})
			expect(getGenerativeModelMock).toHaveBeenCalledWith({
				model: "gemini-2.5-flash",
				generationConfig: {
					responseMimeType: "application/json",
				},
			})
		})
	})

	describe("generateEmbedding", () => {
		it("should call embedContent and return embedding with token estimate", async () => {
			// Arrange
			embedContentMock.mockResolvedValue({
				embedding: {
					values: [0.11, 0.22, 0.33],
				},
			})

			// Act
			const result = await service.generateEmbedding("анонимизированный текст")

			// Assert
			expect(embedContentMock).toHaveBeenCalledWith({
				content: {
					role: "user",
					parts: [{ text: "анонимизированный текст" }],
				},
				outputDimensionality: 768,
			})
			expect(result.embedding).toEqual([0.11, 0.22, 0.33])
			expect(result.tokensUsed).toBe(
				Math.ceil("анонимизированный текст".length / 4),
			)
		})

		it("should retry on retryable errors and eventually succeed", async () => {
			// Arrange
			vi.useFakeTimers()
			embedContentMock
				.mockRejectedValueOnce(new Error("429 Please retry in 0.01s"))
				.mockResolvedValueOnce({
					embedding: { values: [0.99] },
				})

			// Act
			const call = service.generateEmbedding("text")
			await vi.advanceTimersByTimeAsync(1200)
			const result = await call

			// Assert
			expect(embedContentMock).toHaveBeenCalledTimes(2)
			expect(result.embedding).toEqual([0.99])

			vi.useRealTimers()
		})

		it("should fail without retries for non-retryable error", async () => {
			// Arrange
			embedContentMock.mockRejectedValue(new Error("Invalid request format"))

			// Act
			const call = service.generateEmbedding("bad")

			// Assert
			await expect(call).rejects.toThrow("Invalid request format")
			expect(embedContentMock).toHaveBeenCalledTimes(1)
		})
	})

	describe("generateEmbeddings", () => {
		it("should generate embeddings sequentially and sum tokens", async () => {
			// Arrange
			const generateEmbeddingSpy = vi
				.spyOn(service, "generateEmbedding")
				.mockResolvedValueOnce({ embedding: [1], tokensUsed: 2 })
				.mockResolvedValueOnce({ embedding: [2], tokensUsed: 3 })

			// Act
			const result = await service.generateEmbeddings(["one", "two"])

			// Assert
			expect(generateEmbeddingSpy).toHaveBeenNthCalledWith(1, "one")
			expect(generateEmbeddingSpy).toHaveBeenNthCalledWith(2, "two")
			expect(result).toEqual({ embeddings: [[1], [2]], tokensUsed: 5 })
		})
	})

	describe("generateSummary", () => {
		it("should parse model JSON response and return normalized summary", async () => {
			// Arrange
			generateContentMock.mockResolvedValue({
				response: {
					text: () =>
						JSON.stringify({
							title: "  Заголовок  ",
							resume: "  Резюме  ",
							report: "  Детальный отчёт  ",
							tags: [
								{
									name: "Терапия",
									description: "Лечение",
									color: "#3B82F6",
									isSystem: true,
								},
							],
						}),
					usageMetadata: {
						promptTokenCount: 120,
						candidatesTokenCount: 40,
					},
				},
			})

			// Act
			const result = await service.generateSummary("medical text")

			// Assert
			expect(generateContentMock).toHaveBeenCalledTimes(1)
			expect(result).toEqual({
				title: "Заголовок",
				summary: "Резюме",
				report: "Детальный отчёт",
				tags: [
					{
						name: "Терапия",
						description: "Лечение",
						color: "#3B82F6",
						isSystem: true,
					},
				],
				tokensUsed: 160,
			})
		})

		it("should retry summary generation on temporary network errors", async () => {
			// Arrange
			vi.useFakeTimers()
			generateContentMock
				.mockRejectedValueOnce(new Error("fetch failed"))
				.mockResolvedValueOnce({
					response: {
						text: () =>
							JSON.stringify({
								title: "T",
								resume: "S",
								report: "R",
								tags: [],
							}),
						usageMetadata: {
							promptTokenCount: 1,
							candidatesTokenCount: 2,
						},
					},
				})

			// Act
			const call = service.generateSummary("doc")
			await vi.advanceTimersByTimeAsync(1200)
			const result = await call

			// Assert
			expect(generateContentMock).toHaveBeenCalledTimes(2)
			expect(result.tokensUsed).toBe(3)

			vi.useRealTimers()
		})
	})

	describe("retry delay extraction", () => {
		it("should extract retry delay from API text format", () => {
			// Act
			const delay = (
				service as unknown as {
					extractRetryDelay: (msg: string) => number | null
				}
			).extractRetryDelay("429 Too many requests. Please retry in 13.5s")

			// Assert
			expect(delay).toBe(13500)
		})

		it("should extract retry delay from retryDelay JSON format", () => {
			// Act
			const delay = (
				service as unknown as {
					extractRetryDelay: (msg: string) => number | null
				}
			).extractRetryDelay('{"retryDelay":"16s"}')

			// Assert
			expect(delay).toBe(16000)
		})
	})
})
