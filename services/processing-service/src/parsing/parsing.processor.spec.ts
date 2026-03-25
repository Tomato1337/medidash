import { Test, TestingModule } from "@nestjs/testing"
import { describe, it, expect, beforeEach, vi } from "vitest"
import { getQueueToken } from "@nestjs/bullmq"
import { ParsingProcessor } from "./parsing.processor"
import { ParsingService } from "./parsing.service"
import { EventsService } from "../events/events.service"
import { QUEUES, JOBS } from "../queue/queue.constants"
import { FailedPhase, type ParsingJobData } from "@shared-types"

describe("ParsingProcessor", () => {
	let processor: ParsingProcessor

	const mockParsingService = {
		parseDocument: vi.fn(),
		splitIntoChunks: vi.fn(),
		saveChunks: vi.fn(),
		publishDocumentParsed: vi.fn(),
		publishDocumentStatusUpdate: vi.fn(),
		checkAllDocumentsParsed: vi.fn(),
	}

	const mockEventsService = {
		publishEvent: vi.fn(),
	}

	const mockAiProcessingQueue = {
		add: vi.fn(),
	}

	const createJob = (overrides: Partial<ParsingJobData> = {}) => {
		return {
			id: "job-1",
			data: {
				documentId: "doc-1",
				recordId: "record-1",
				userId: "user-1",
				minioObjectKey: "docs/doc-1.pdf",
				mimeType: "application/pdf",
				originalFileName: "doc-1.pdf",
				allDocumentIds: ["doc-1", "doc-2"],
				...overrides,
			},
			updateProgress: vi.fn(),
		}
	}

	beforeEach(async () => {
		vi.clearAllMocks()

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				ParsingProcessor,
				{ provide: ParsingService, useValue: mockParsingService },
				{ provide: EventsService, useValue: mockEventsService },
				{
					provide: getQueueToken(QUEUES.AI_PROCESSING),
					useValue: mockAiProcessingQueue,
				},
			],
		}).compile()

		processor = module.get<ParsingProcessor>(ParsingProcessor)
	})

	it("processes parsing job and enqueues AI job when all docs parsed", async () => {
		const job = createJob()
		const content = {
			text: "Example text",
			pageCount: 2,
			metadata: {},
		}
		const chunks = [
			{ content: "example", index: 0, startPosition: 0, endPosition: 7 },
		]

		mockParsingService.parseDocument.mockResolvedValue(content)
		mockParsingService.splitIntoChunks.mockReturnValue(chunks)
		mockParsingService.saveChunks.mockResolvedValue(undefined)
		mockParsingService.publishDocumentParsed.mockResolvedValue(undefined)
		mockParsingService.publishDocumentStatusUpdate.mockResolvedValue(undefined)
		mockParsingService.checkAllDocumentsParsed.mockResolvedValue({
			allParsed: true,
			documentIds: ["doc-1", "doc-2"],
		})
		mockEventsService.publishEvent.mockResolvedValue(undefined)
		mockAiProcessingQueue.add.mockResolvedValue({ id: "ai-job-1" })

		await processor.process(job as never)

		expect(mockParsingService.parseDocument).toHaveBeenCalledWith(
			"docs/doc-1.pdf",
			"application/pdf",
		)
		expect(mockParsingService.splitIntoChunks).toHaveBeenCalledWith("example text")
		expect(mockParsingService.saveChunks).toHaveBeenCalledWith(
			"doc-1",
			"record-1",
			"user-1",
			chunks,
		)
		expect(mockAiProcessingQueue.add).toHaveBeenCalledWith(
			JOBS.PROCESS_RECORD,
			{
				recordId: "record-1",
				userId: "user-1",
				documentIds: ["doc-1", "doc-2"],
			},
			expect.objectContaining({ attempts: 3 }),
		)
	})

	it("does not enqueue AI job when not all docs parsed", async () => {
		const job = createJob()

		mockParsingService.parseDocument.mockResolvedValue({
			text: "Text",
			pageCount: 1,
			metadata: {},
		})
		mockParsingService.splitIntoChunks.mockReturnValue([
			{ content: "text", index: 0, startPosition: 0, endPosition: 4 },
		])
		mockParsingService.saveChunks.mockResolvedValue(undefined)
		mockParsingService.publishDocumentParsed.mockResolvedValue(undefined)
		mockParsingService.publishDocumentStatusUpdate.mockResolvedValue(undefined)
		mockParsingService.checkAllDocumentsParsed.mockResolvedValue({
			allParsed: false,
			documentIds: ["doc-1"],
		})
		mockEventsService.publishEvent.mockResolvedValue(undefined)

		await processor.process(job as never)

		expect(mockAiProcessingQueue.add).not.toHaveBeenCalled()
	})

	it("publishes failed status and rethrows on processing error", async () => {
		const job = createJob()
		const error = new Error("MinIO unavailable")

		mockParsingService.parseDocument.mockRejectedValue(error)
		mockParsingService.publishDocumentStatusUpdate.mockResolvedValue(undefined)
		mockEventsService.publishEvent.mockResolvedValue(undefined)

		await expect(processor.process(job as never)).rejects.toThrow(
			"MinIO unavailable",
		)

		expect(mockParsingService.publishDocumentStatusUpdate).toHaveBeenCalledWith(
			"doc-1",
			"record-1",
			"user-1",
			"FAILED",
			"MinIO unavailable",
			FailedPhase.PARSING,
		)
		expect(mockEventsService.publishEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "parsing:failed",
				recordId: "record-1",
				userId: "user-1",
				documentId: "doc-1",
				error: "MinIO unavailable",
			}),
		)
	})
})
