import { Test, TestingModule } from "@nestjs/testing"
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import axios from "axios"
import { HttpStatus } from "@nestjs/common"
import { getQueueToken } from "@nestjs/bullmq"
import { RecoveryService } from "./recovery.service"
import { EventsService } from "../events/events.service"
import { EnvService } from "../env/env.service"
import { QUEUES } from "../queue/queue.constants"
import { DocumentStatus, FailedPhase, RedisChannels } from "@shared-types"

describe("RecoveryService", () => {
	let service: RecoveryService

	const mockEventsService = {
		publishToChannel: vi.fn(),
	}

	const mockEnvService = {
		get: vi.fn((key: string) => {
			if (key === "DOCUMENT_SERVICE_URL") return "http://document-service:3001"
			return undefined
		}),
	}

	const mockParsingQueue = {
		client: Promise.resolve(true),
		getWaitingCount: vi.fn(),
		getActiveCount: vi.fn(),
		getFailedCount: vi.fn(),
		add: vi.fn(),
	}

	const mockAiQueue = {
		getWaitingCount: vi.fn(),
		getActiveCount: vi.fn(),
		getFailedCount: vi.fn(),
		add: vi.fn(),
	}

	beforeEach(async () => {
		vi.clearAllMocks()

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				RecoveryService,
				{ provide: EventsService, useValue: mockEventsService },
				{ provide: EnvService, useValue: mockEnvService },
				{
					provide: getQueueToken(QUEUES.PARSING),
					useValue: mockParsingQueue,
				},
				{
					provide: getQueueToken(QUEUES.AI_PROCESSING),
					useValue: mockAiQueue,
				},
			],
		}).compile()

		service = module.get<RecoveryService>(RecoveryService)
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it("retries parsing by publishing retry event", async () => {
		mockEventsService.publishToChannel.mockResolvedValue(undefined)

		const result = await service.retryProcessing(
			"record-1",
			FailedPhase.PARSING,
			"user-1",
		)

		expect(mockEventsService.publishToChannel).toHaveBeenCalledWith(
			RedisChannels.REQUEST_RETRY_PARSING,
			expect.objectContaining({ recordId: "record-1", userId: "user-1" }),
		)
		expect(result).toEqual({
			success: true,
			recordId: "record-1",
			phase: FailedPhase.PARSING,
			documentsCount: 0,
			message: "Started parsing recovery request for record record-1",
		})
	})

	it("retries AI processing by publishing retry event", async () => {
		mockEventsService.publishToChannel.mockResolvedValue(undefined)

		const result = await service.retryProcessing(
			"record-2",
			FailedPhase.PROCESSING,
			"user-2",
		)

		expect(mockEventsService.publishToChannel).toHaveBeenCalledWith(
			RedisChannels.REQUEST_RETRY_AI,
			expect.objectContaining({ recordId: "record-2", userId: "user-2" }),
		)
		expect(result.phase).toBe(FailedPhase.PROCESSING)
	})

	it("returns processing status with queue stats", async () => {
		vi.spyOn(axios, "get").mockResolvedValue({
			data: [
				{
					id: "doc-1",
					status: DocumentStatus.PROCESSING,
					failedPhase: null,
				},
			],
		} as never)

		mockParsingQueue.getWaitingCount.mockResolvedValue(2)
		mockParsingQueue.getActiveCount.mockResolvedValue(1)
		mockParsingQueue.getFailedCount.mockResolvedValue(0)
		mockAiQueue.getWaitingCount.mockResolvedValue(0)
		mockAiQueue.getActiveCount.mockResolvedValue(1)
		mockAiQueue.getFailedCount.mockResolvedValue(0)

		const result = await service.getProcessingStatus("record-1", "user-1")

		expect(result.recordId).toBe("record-1")
		expect(result.status).toBe("PROCESSING")
		expect(result.parsingQueueStats).toEqual({
			waiting: 2,
			active: 1,
			failed: 0,
		})
		expect(result.aiQueueStats).toEqual({
			waiting: 0,
			active: 1,
			failed: 0,
		})
	})

	it("throws NOT_FOUND when document service returns 404", async () => {
		vi.spyOn(axios, "get").mockRejectedValue({
			isAxiosError: true,
			response: { status: 404 },
		})

		await expect(
			service.getProcessingStatus("missing-record", "user-1"),
		).rejects.toMatchObject({
			response: "Record not found",
			status: HttpStatus.NOT_FOUND,
		})
	})

	it("throws INTERNAL_SERVER_ERROR on unknown status retrieval errors", async () => {
		vi.spyOn(axios, "get").mockRejectedValue(new Error("boom"))

		await expect(
			service.getProcessingStatus("record-1", "user-1"),
		).rejects.toMatchObject({
			response: "Failed to get processing status",
			status: HttpStatus.INTERNAL_SERVER_ERROR,
		})
	})

	it("returns health check with queue and dependency statuses", async () => {
		vi.spyOn(axios, "get").mockResolvedValue({ data: { ok: true } } as never)
		mockParsingQueue.getWaitingCount.mockResolvedValue(0)
		mockAiQueue.getWaitingCount.mockResolvedValue(0)

		const result = await service.getHealthCheck()

		expect(result.status).toBe("ok")
		expect(result.service).toBe("processing-service")
		expect(result.connections.redis).toBe("connected")
		expect(result.connections.database).toBe("connected (via http)")
		expect(result.connections.parsingQueue).toBe("ready")
		expect(result.connections.aiProcessingQueue).toBe("ready")
	})

	it("returns queues status with queue names and stats", async () => {
		mockParsingQueue.getWaitingCount.mockResolvedValue(3)
		mockParsingQueue.getActiveCount.mockResolvedValue(2)
		mockParsingQueue.getFailedCount.mockResolvedValue(1)
		mockAiQueue.getWaitingCount.mockResolvedValue(4)
		mockAiQueue.getActiveCount.mockResolvedValue(0)
		mockAiQueue.getFailedCount.mockResolvedValue(2)

		const result = await service.getQueuesStatus()

		expect(result.parsing.name).toBe(QUEUES.PARSING)
		expect(result.aiProcessing.name).toBe(QUEUES.AI_PROCESSING)
		expect(result.parsing.stats).toEqual({ waiting: 3, active: 2, failed: 1 })
		expect(result.aiProcessing.stats).toEqual({
			waiting: 4,
			active: 0,
			failed: 2,
		})
	})
})
