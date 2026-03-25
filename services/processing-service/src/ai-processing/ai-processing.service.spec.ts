import { Test, TestingModule } from "@nestjs/testing"
import {
	describe,
	it,
	expect,
	beforeEach,
	vi,
	afterEach,
	type Mock,
} from "vitest"
import axios, { HttpStatusCode } from "axios"
import { HttpException, HttpStatus } from "@nestjs/common"
import { AiProcessingService } from "./ai-processing.service"
import { EnvService } from "src/env/env.service"
import { PrismaService } from "../prisma/prisma.service"
import { EventsService } from "../events/events.service"
import { DocumentStatus, RedisChannels } from "@shared-types"

vi.mock("tonl", () => ({
	encodeTONL: vi.fn((text: string) => `optimized:${text}`),
}))

describe("AiProcessingService", () => {
	let service: AiProcessingService

	const postMock = vi.fn()

	const mockEnvService = {
		get: vi.fn((key: string) => {
			if (key === "AI_SERVICE_URL") return "http://ai-service:3003"
			return undefined
		}),
	}

	const mockPrismaService = {
		documentChunk: {
			findMany: vi.fn(),
			update: vi.fn(),
		},
		$executeRaw: vi.fn(),
		piiMapping: {
			createMany: vi.fn(),
		},
	}

	const mockEventsService = {
		publishToChannel: vi.fn(),
		publishRecordAiCompleted: vi.fn(),
	}

	beforeEach(async () => {
		vi.clearAllMocks()
		postMock.mockReset()

		vi.spyOn(axios, "create").mockReturnValue({
			post: postMock,
		} as never)

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				AiProcessingService,
				{ provide: EnvService, useValue: mockEnvService },
				{ provide: PrismaService, useValue: mockPrismaService },
				{ provide: EventsService, useValue: mockEventsService },
			],
		}).compile()

		service = module.get<AiProcessingService>(AiProcessingService)
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it("loads chunks from database ordered by document and chunk order", async () => {
		const chunks = [
			{
				id: "chunk-1",
				content: "a",
				order: 0,
				documentId: "doc-1",
				userId: "user-1",
			},
		]
		mockPrismaService.documentChunk.findMany.mockResolvedValue(chunks)

		const result = await service.getChunksFromDatabase(["doc-1"])

		expect(mockPrismaService.documentChunk.findMany).toHaveBeenCalledWith({
			where: {
				documentId: { in: ["doc-1"] },
			},
			orderBy: [{ documentId: "asc" }, { order: "asc" }],
			select: {
				id: true,
				content: true,
				order: true,
				documentId: true,
				userId: true,
			},
		})
		expect(result).toEqual(chunks)
	})

	it("anonymizes chunk through AI service", async () => {
		postMock.mockResolvedValue({
			data: {
				anonymizedText: "Patient [NAME_1]",
				piiMappings: [
					{
						original: "John",
						replacement: "[NAME_1]",
						type: "NAME",
					},
				],
			},
		})

		const result = await service.anonymizeChunk("Patient John")

		expect(postMock).toHaveBeenCalledWith("/api/ai/anonymize", {
			text: "Patient John",
		})
		expect(result).toEqual({
			anonymizedContent: "Patient [NAME_1]",
			piiMappings: [
				{
					original: "John",
					replacement: "[NAME_1]",
					type: "NAME",
				},
			],
		})
	})

	it("throws HttpException when anonymization API fails", async () => {
		const axiosError = {
			isAxiosError: true,
			message: "Network Error",
			response: {
				status: HttpStatusCode.BadGateway,
				data: { message: "upstream failed" },
			},
		}

		postMock.mockRejectedValue(axiosError)

		await expect(service.anonymizeChunk("text")).rejects.toBeInstanceOf(
			HttpException,
		)
		await expect(service.anonymizeChunk("text")).rejects.toMatchObject({
			response: "AI Service anonymization error: upstream failed",
			status: HttpStatusCode.BadGateway,
		})
	})

	it("generates embedding through AI service", async () => {
		postMock.mockResolvedValue({
			data: {
				embedding: [0.1, 0.2, 0.3],
				tokensUsed: 11,
			},
		})

		const embedding = await service.generateEmbedding("anon text")

		expect(postMock).toHaveBeenCalledWith("/api/ai/embeddings", {
			text: "anon text",
		})
		expect(embedding).toEqual([0.1, 0.2, 0.3])
	})

	it("processes chunks with anonymization and embedding generation", async () => {
		const anonymizeSpy = vi
			.spyOn(service, "anonymizeChunk")
			.mockResolvedValue({
				anonymizedContent: "Anon",
				piiMappings: [],
			})
		const embeddingSpy = vi
			.spyOn(service, "generateEmbedding")
			.mockResolvedValue([0.4, 0.5])

		const result = await service.processChunks([
			{
				id: "chunk-1",
				content: "Raw",
				order: 0,
				documentId: "doc-1",
				userId: "user-1",
			},
		])

		expect(anonymizeSpy).toHaveBeenCalledWith("Raw")
		expect(mockPrismaService.documentChunk.update).toHaveBeenCalledWith({
			data: {
				content: "Anon",
			},
			where: {
				id: "chunk-1",
			},
		})
		expect(embeddingSpy).toHaveBeenCalledWith("Anon")
		expect(result).toEqual([
			{
				id: "chunk-1",
				documentId: "doc-1",
				userId: "user-1",
				anonymizedContent: "Anon",
				embedding: [0.4, 0.5],
				piiMappings: [],
			},
		])
	})

	it("saves processed chunks and persists pii mappings", async () => {
		mockPrismaService.$executeRaw.mockResolvedValue(1)
		mockPrismaService.piiMapping.createMany.mockResolvedValue({ count: 1 })

		await service.saveProcessedChunks([
			{
				id: "chunk-1",
				documentId: "doc-1",
				userId: "user-1",
				anonymizedContent: "Anon text",
				embedding: [1, 2, 3],
				piiMappings: [
					{
						original: "John",
						replacement: "[NAME_1]",
						type: "NAME",
					},
				],
			},
		])

		expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(1)
		expect(mockPrismaService.piiMapping.createMany).toHaveBeenCalledWith({
			data: [
				{
					documentId: "doc-1",
					userId: "user-1",
					chunkId: "chunk-1",
					original: "John",
					replacement: "[NAME_1]",
					type: "NAME",
				},
			],
		})
	})

	it("updates document status through redis channel", async () => {
		await service.updateDocumentStatus(
			"doc-1",
			DocumentStatus.FAILED,
			"AI down",
			"PROCESSING",
		)

		expect(mockEventsService.publishToChannel).toHaveBeenCalledWith(
			RedisChannels.DOCUMENT_STATUS_UPDATE,
			expect.objectContaining({
				documentId: "doc-1",
				status: DocumentStatus.FAILED,
				errorMessage: "AI down",
				failedPhase: "PROCESSING",
			}),
		)
	})

	it("publishes AI completion payload for record", async () => {
		await service.notifyRecordProcessingCompleted("record-1", "user-1", {
			title: "Title",
			summary: "Summary",
			report: "Report",
			tags: [{ name: "lab" }],
			tokensUsed: 99,
			structuredData: { key: "value" },
		})

		expect(mockEventsService.publishRecordAiCompleted).toHaveBeenCalledWith(
			"record-1",
			"user-1",
			{
				title: "Title",
				summary: "Summary",
				description: "Report",
				tags: ["lab"],
				structuredData: { key: "value" },
			},
		)
	})

	it("wraps summary generation errors into HttpException", async () => {
		const axiosError = {
			isAxiosError: true,
			message: "timeout",
			response: {
				status: HttpStatus.REQUEST_TIMEOUT,
				data: { message: "request timeout" },
			},
		}
		postMock.mockRejectedValue(axiosError)

		await expect(service.generateSummary("big text")).rejects.toBeInstanceOf(
			HttpException,
		)
	})

	it("falls back to original text when TONL is unavailable", async () => {
		// encodeTONL — переменная уровня модуля, vi.mock("tonl") ставит её всегда.
		// Чтобы проверить fallback, нужно сбросить модульную переменную через динамический import
		const tonlModule = await import("tonl")
		const originalEncode = tonlModule.encodeTONL
		// @ts-expect-error — принудительно сбрасываем для теста fallback
		tonlModule.encodeTONL = undefined

		// Пересоздаём сервис чтобы initTonl() подхватил undefined
		const { Test: NestTest } = await import("@nestjs/testing")
		vi.spyOn(axios, "create").mockReturnValue({ post: postMock } as never)
		const mod = await NestTest.createTestingModule({
			providers: [
				AiProcessingService,
				{ provide: EnvService, useValue: mockEnvService },
				{ provide: PrismaService, useValue: mockPrismaService },
				{ provide: EventsService, useValue: mockEventsService },
			],
		}).compile()
		const freshService = mod.get<AiProcessingService>(AiProcessingService)

		const result = freshService.optimizeWithTONL("abc")

		expect(result).toEqual({
			optimized: "abc",
			originalLength: 3,
			optimizedLength: 3,
		})

		// Восстанавливаем
		tonlModule.encodeTONL = originalEncode
	})
})
