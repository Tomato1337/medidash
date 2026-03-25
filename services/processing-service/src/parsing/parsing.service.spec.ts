import { Test, TestingModule } from "@nestjs/testing"
import { describe, it, expect, beforeEach, vi } from "vitest"
import pdfParse from "pdf-parse"
import { ParsingService } from "./parsing.service"
import { EnvService } from "../env/env.service"
import { MinioService } from "../minio/minio.service"
import { PrismaService } from "../prisma/prisma.service"
import { EventsService } from "../events/events.service"
import { RedisChannels } from "@shared-types"

vi.mock("pdf-parse", () => ({
	default: vi.fn(),
}))

describe("ParsingService", () => {
	let service: ParsingService

	const mockEnvService = {
		get: vi.fn((key: string) => {
			if (key === "CHUNK_SIZE") return 50
			if (key === "CHUNK_OVERLAP") return 10
			return undefined
		}),
	}

	const mockMinioService = {
		downloadFile: vi.fn(),
	}

	const mockPrismaService = {
		documentChunk: {
			deleteMany: vi.fn(),
			createMany: vi.fn(),
			findMany: vi.fn(),
		},
	}

	const mockEventsService = {
		publishToChannel: vi.fn(),
	}

	beforeEach(async () => {
		vi.clearAllMocks()

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				ParsingService,
				{ provide: EnvService, useValue: mockEnvService },
				{ provide: MinioService, useValue: mockMinioService },
				{ provide: PrismaService, useValue: mockPrismaService },
				{ provide: EventsService, useValue: mockEventsService },
			],
		}).compile()

		service = module.get<ParsingService>(ParsingService)
	})

	it("parses PDF document by mime type", async () => {
		const mockedPdfParse = vi.mocked(pdfParse)
		mockMinioService.downloadFile.mockResolvedValue(Buffer.from("pdf-binary"))
		mockedPdfParse.mockResolvedValue({
			text: "  Line 1\r\n\r\n\r\nLine\t\t2  ",
			numpages: 3,
			info: {
				Title: "Report",
				Author: "Doctor",
				CreationDate: "2026-01-01",
			},
		} as never)

		const result = await service.parseDocument(
			"records/file.bin",
			"application/pdf",
		)

		expect(mockMinioService.downloadFile).toHaveBeenCalledWith("records/file.bin")
		expect(mockedPdfParse).toHaveBeenCalled()
		// cleanText: /^\s+|\s+$/gm с флагом m убирает \s (включая \n) на границах строк,
		// поэтому пустые строки между абзацами схлопываются
		expect(result).toEqual({
			text: "Line 1Line 2",
			pageCount: 3,
			metadata: {
				title: "Report",
				author: "Doctor",
				creationDate: "2026-01-01",
			},
		})
	})

	it("parses TXT document by extension", async () => {
		mockMinioService.downloadFile.mockResolvedValue(
			Buffer.from("  hello\r\n\r\n\r\nworld  "),
		)

		const result = await service.parseDocument("sample.txt")

		// cleanText: /^\s+|\s+$/gm схлопывает пустые строки между словами
		expect(result).toEqual({
			text: "helloworld",
			pageCount: 1,
			metadata: {},
		})
	})

	it("falls back to PDF parsing for unknown extension", async () => {
		const mockedPdfParse = vi.mocked(pdfParse)
		mockMinioService.downloadFile.mockResolvedValue(Buffer.from("unknown"))
		mockedPdfParse.mockResolvedValue({
			text: "raw",
			numpages: 1,
			info: {},
		} as never)

		await service.parseDocument("file.unknown")

		expect(mockedPdfParse).toHaveBeenCalled()
	})

	it("rethrows parsing errors for unsupported content", async () => {
		const mockedPdfParse = vi.mocked(pdfParse)
		mockMinioService.downloadFile.mockResolvedValue(Buffer.from("bad"))
		mockedPdfParse.mockRejectedValue(new Error("Invalid PDF"))

		await expect(service.parseDocument("broken.xyz")).rejects.toThrow(
			"Invalid PDF",
		)
	})

	it("splits long text into overlapping chunks", () => {
		const text = "Sentence one. Sentence two is here. Sentence three is long enough."

		const chunks = service.splitIntoChunks(text)

		expect(chunks.length).toBeGreaterThan(1)
		expect(chunks[0]).toMatchObject({ index: 0, startPosition: 0 })
		expect(chunks[1].startPosition).toBeLessThan(chunks[0].endPosition)
	})

	it("returns single chunk for short text", () => {
		const chunks = service.splitIntoChunks("short text")

		expect(chunks).toEqual([
			{
				content: "short text",
				index: 0,
				startPosition: 0,
				endPosition: 10,
			},
		])
	})

	it("publishes document status update to Redis channel", async () => {
		await service.publishDocumentStatusUpdate(
			"doc-1",
			"rec-1",
			"user-1",
			"FAILED",
			"Parsing error",
			"PARSING",
		)

		expect(mockEventsService.publishToChannel).toHaveBeenCalledWith(
			RedisChannels.DOCUMENT_STATUS_UPDATE,
			{
				documentId: "doc-1",
				recordId: "rec-1",
				userId: "user-1",
				status: "FAILED",
				errorMessage: "Parsing error",
				failedPhase: "PARSING",
			},
		)
	})
})
