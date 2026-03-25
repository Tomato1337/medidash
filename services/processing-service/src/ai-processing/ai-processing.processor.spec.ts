import { Test, TestingModule } from "@nestjs/testing"
import { describe, it, expect, beforeEach, vi } from "vitest"
import { AiProcessingProcessor } from "./ai-processing.processor"
import { AiProcessingService } from "./ai-processing.service"
import { EventsService } from "../events/events.service"
import { DocumentStatus, FailedPhase, type AiProcessingJobData } from "@shared-types"

describe("AiProcessingProcessor", () => {
	let processor: AiProcessingProcessor

	const mockAiProcessingService = {
		getChunksFromDatabase: vi.fn(),
		processChunks: vi.fn(),
		saveProcessedChunks: vi.fn(),
		generateSummary: vi.fn(),
		notifyRecordProcessingCompleted: vi.fn(),
		updateRecordDocumentsStatus: vi.fn(),
		updateDocumentStatus: vi.fn(),
	}

	const mockEventsService = {
		publishEvent: vi.fn(),
	}

	const createJob = (overrides: Partial<AiProcessingJobData> = {}) => {
		return {
			id: "ai-job-1",
			data: {
				recordId: "record-1",
				userId: "user-1",
				documentIds: ["doc-1", "doc-2"],
				...overrides,
			},
			updateProgress: vi.fn(),
		}
	}

	beforeEach(async () => {
		vi.clearAllMocks()

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				AiProcessingProcessor,
				{ provide: AiProcessingService, useValue: mockAiProcessingService },
				{ provide: EventsService, useValue: mockEventsService },
			],
		}).compile()

		processor = module.get<AiProcessingProcessor>(AiProcessingProcessor)
	})

	it("processes AI job end-to-end and marks documents completed", async () => {
		const job = createJob()
		const chunks = [
			{
				id: "chunk-1",
				content: "raw",
				order: 0,
				documentId: "doc-1",
				userId: "user-1",
			},
		]
		const processedChunks = [
			{
				id: "chunk-1",
				documentId: "doc-1",
				userId: "user-1",
				anonymizedContent: "anon",
				embedding: [0.1],
				piiMappings: [{ original: "A", replacement: "B", type: "NAME" }],
			},
		]

		mockAiProcessingService.getChunksFromDatabase.mockResolvedValue(chunks)
		mockAiProcessingService.processChunks.mockResolvedValue(processedChunks)
		mockAiProcessingService.saveProcessedChunks.mockResolvedValue(undefined)
		mockAiProcessingService.generateSummary.mockResolvedValue({
			title: "Medical summary",
			summary: "Short summary",
			report: "Long report",
			tags: [{ name: "urgent", description: "", color: "red", isSystem: true }],
			tokensUsed: 321,
		})
		mockAiProcessingService.notifyRecordProcessingCompleted.mockResolvedValue(
			undefined,
		)
		mockAiProcessingService.updateRecordDocumentsStatus.mockResolvedValue(
			undefined,
		)
		mockEventsService.publishEvent.mockResolvedValue(undefined)

		await processor.process(job as never)

		expect(mockAiProcessingService.getChunksFromDatabase).toHaveBeenCalledWith([
			"doc-1",
			"doc-2",
		])
		expect(mockAiProcessingService.processChunks).toHaveBeenCalledWith(chunks)
		expect(mockAiProcessingService.saveProcessedChunks).toHaveBeenCalledWith(
			processedChunks,
		)
		expect(
			mockAiProcessingService.notifyRecordProcessingCompleted,
		).toHaveBeenCalledWith("record-1", "user-1", {
			title: "Medical summary",
			summary: "Short summary",
			report: "Long report",
			tags: [
				{ name: "urgent", description: "", color: "red", isSystem: true },
			],
			tokensUsed: 321,
			structuredData: {},
		})
		expect(mockAiProcessingService.updateRecordDocumentsStatus).toHaveBeenCalledWith(
			["doc-1", "doc-2"],
			DocumentStatus.COMPLETED,
		)
		expect(mockEventsService.publishEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "processing:completed",
				recordId: "record-1",
				userId: "user-1",
			}),
		)
	})

	it("throws when no chunks found for record", async () => {
		const job = createJob()
		mockAiProcessingService.getChunksFromDatabase.mockResolvedValue([])
		mockAiProcessingService.updateDocumentStatus.mockResolvedValue(undefined)
		mockEventsService.publishEvent.mockResolvedValue(undefined)

		await expect(processor.process(job as never)).rejects.toThrow(
			"No chunks found in DocumentChunk table",
		)
		expect(mockAiProcessingService.updateDocumentStatus).toHaveBeenCalledTimes(2)
		expect(mockAiProcessingService.updateDocumentStatus).toHaveBeenNthCalledWith(
			1,
			"doc-1",
			DocumentStatus.FAILED,
			expect.stringContaining("No chunks found in DocumentChunk table"),
			FailedPhase.PROCESSING,
		)
	})

	it("marks documents failed and rethrows on AI processing error", async () => {
		const job = createJob()
		mockAiProcessingService.getChunksFromDatabase.mockResolvedValue([
			{
				id: "chunk-1",
				content: "raw",
				order: 0,
				documentId: "doc-1",
				userId: "user-1",
			},
		])
		mockAiProcessingService.processChunks.mockRejectedValue(new Error("AI timeout"))
		mockAiProcessingService.updateDocumentStatus.mockResolvedValue(undefined)
		mockEventsService.publishEvent.mockResolvedValue(undefined)

		await expect(processor.process(job as never)).rejects.toThrow("AI timeout")

		expect(mockAiProcessingService.updateDocumentStatus).toHaveBeenCalledTimes(2)
		expect(mockEventsService.publishEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "processing:failed",
				error: "AI timeout",
			}),
		)
	})
})
