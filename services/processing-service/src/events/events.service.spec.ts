import { Test, TestingModule } from "@nestjs/testing"
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { getQueueToken } from "@nestjs/bullmq"
import Redis from "ioredis"
import { EventsService } from "./events.service"
import { EnvService } from "src/env/env.service"
import { JOBS, QUEUES } from "../queue/queue.constants"
import { RedisChannels } from "@shared-types"

const redisInstances: Array<{
	on: ReturnType<typeof vi.fn>
	connect: ReturnType<typeof vi.fn>
	subscribe: ReturnType<typeof vi.fn>
	publish: ReturnType<typeof vi.fn>
	unsubscribe: ReturnType<typeof vi.fn>
	quit: ReturnType<typeof vi.fn>
}> = []

vi.mock("ioredis", () => {
	// Используем function() вместо arrow function — new требует конструктор
	const RedisMock = vi.fn(function (this: Record<string, unknown>) {
		const instance = {
			on: vi.fn(),
			connect: vi.fn().mockResolvedValue(undefined),
			subscribe: vi.fn().mockResolvedValue(2),
			publish: vi.fn().mockResolvedValue(1),
			unsubscribe: vi.fn().mockResolvedValue(undefined),
			quit: vi.fn().mockResolvedValue(undefined),
		}
		redisInstances.push(instance)
		Object.assign(this, instance)
	})
	return { default: RedisMock }
})

describe("EventsService", () => {
	let service: EventsService

	const mockEnvService = {
		get: vi.fn((key: string) => {
			if (key === "REDIS_HOST") return "localhost"
			if (key === "REDIS_PORT") return 6379
			if (key === "REDIS_PASSWORD") return ""
			return undefined
		}),
	}

	const mockParsingQueue = {
		addBulk: vi.fn(),
	}

	const mockAiQueue = {
		add: vi.fn(),
	}

	beforeEach(async () => {
		vi.clearAllMocks()
		redisInstances.length = 0

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				EventsService,
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

		service = module.get<EventsService>(EventsService)
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it("initializes redis connections and subscribes to channels", async () => {
		await service.onModuleInit()

		expect(Redis).toHaveBeenCalledTimes(2)
		expect(redisInstances[0].connect).toHaveBeenCalled()
		expect(redisInstances[1].connect).toHaveBeenCalled()
		expect(redisInstances[0].subscribe).toHaveBeenCalledWith(
			RedisChannels.RECORD_READY_FOR_PARSING,
			RedisChannels.RECORD_READY_FOR_AI,
		)
	})

	it("publishes processing event to processing channel", async () => {
		await service.onModuleInit()

		await service.publishEvent({
			type: "processing:started",
			recordId: "record-1",
			userId: "user-1",
			timestamp: new Date().toISOString(),
		})

		expect(redisInstances[1].publish).toHaveBeenCalledWith(
			RedisChannels.PROCESSING_EVENTS,
			expect.stringContaining('"type":"processing:started"'),
		)
	})

	it("publishes payload to provided channel", async () => {
		await service.onModuleInit()

		await service.publishToChannel(RedisChannels.DOCUMENT_STATUS_UPDATE, {
			documentId: "doc-1",
			status: "PROCESSING",
		})

		expect(redisInstances[1].publish).toHaveBeenCalledWith(
			RedisChannels.DOCUMENT_STATUS_UPDATE,
			expect.stringContaining('"documentId":"doc-1"'),
		)
	})

	it("publishes record AI completion via dedicated helper", async () => {
		await service.onModuleInit()

		await service.publishRecordAiCompleted("record-1", "user-1", {
			title: "T",
			summary: "S",
			description: "D",
			tags: ["urgent"],
		})

		expect(redisInstances[1].publish).toHaveBeenCalledWith(
			RedisChannels.RECORD_AI_COMPLETED,
			expect.stringContaining('"recordId":"record-1"'),
		)
	})

	it("creates parsing jobs when parsing event message is received", async () => {
		await service.onModuleInit()

		const subscriberOn = redisInstances[0].on
		const messageHandler = subscriberOn.mock.calls.find(
			([eventName]) => eventName === "message",
		)?.[1] as ((channel: string, message: string) => Promise<void>) | undefined

		expect(messageHandler).toBeDefined()

		await messageHandler?.(
			RedisChannels.RECORD_READY_FOR_PARSING,
			JSON.stringify({
				recordId: "record-1",
				userId: "user-1",
				timestamp: new Date().toISOString(),
				documents: [
					{
						id: "doc-1",
						minioObjectKey: "doc-1.pdf",
						mimeType: "application/pdf",
						originalFileName: "doc-1.pdf",
					},
				],
			}),
		)

		expect(mockParsingQueue.addBulk).toHaveBeenCalledWith([
			expect.objectContaining({
				name: JOBS.PARSE_DOCUMENT,
				data: expect.objectContaining({
					documentId: "doc-1",
					recordId: "record-1",
					userId: "user-1",
				}),
			}),
		])
	})

	it("creates AI job when ai-ready event message is received", async () => {
		await service.onModuleInit()

		const messageHandler = redisInstances[0].on.mock.calls.find(
			([eventName]) => eventName === "message",
		)?.[1] as ((channel: string, message: string) => Promise<void>) | undefined

		expect(messageHandler).toBeDefined()

		await messageHandler?.(
			RedisChannels.RECORD_READY_FOR_AI,
			JSON.stringify({
				recordId: "record-2",
				userId: "user-2",
				documentIds: ["doc-a", "doc-b"],
			}),
		)

		expect(mockAiQueue.add).toHaveBeenCalledWith(
			JOBS.PROCESS_RECORD,
			{
				recordId: "record-2",
				userId: "user-2",
				documentIds: ["doc-a", "doc-b"],
			},
			expect.objectContaining({ attempts: 3 }),
		)
	})

	it("closes redis connections on module destroy", async () => {
		await service.onModuleInit()
		await service.onModuleDestroy()

		expect(redisInstances[0].unsubscribe).toHaveBeenCalled()
		expect(redisInstances[0].quit).toHaveBeenCalled()
		expect(redisInstances[1].quit).toHaveBeenCalled()
	})
})
