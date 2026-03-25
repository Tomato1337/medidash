import { describe, it, expect, beforeEach, vi } from "vitest"
import { Test, TestingModule } from "@nestjs/testing"
import { SseService } from "./sse.service"
import { EnvService } from "../env/env.service"

// Мокаем ioredis
const subscriberInstance = {
	subscribe: vi.fn().mockResolvedValue(undefined),
	on: vi.fn(),
	quit: vi.fn().mockResolvedValue("OK"),
}

const publisherInstance = {
	publish: vi.fn().mockResolvedValue(1),
	quit: vi.fn().mockResolvedValue("OK"),
}

let constructorCallCount = 0

vi.mock("ioredis", () => ({
	default: vi.fn(function (this: any) {
		constructorCallCount++
		// Первый вызов — subscriber, второй — publisher
		if (constructorCallCount % 2 === 1) {
			Object.assign(this, subscriberInstance)
		} else {
			Object.assign(this, publisherInstance)
		}
	}),
}))

describe("SseService", () => {
	let service: SseService

	const mockEnvService = {
		get: vi.fn((key: string) => {
			const map: Record<string, unknown> = {
				REDIS_HOST: "localhost",
				REDIS_PORT: 6379,
				CORS_ORIGIN: "http://localhost:5173",
			}
			return map[key]
		}),
	}

	beforeEach(async () => {
		vi.clearAllMocks()
		constructorCallCount = 0

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				SseService,
				{ provide: EnvService, useValue: mockEnvService },
			],
		}).compile()

		service = module.get<SseService>(SseService)
	})

	describe("onModuleInit", () => {
		it("подписывается на processing:events в Redis", async () => {
			await service.onModuleInit()

			expect(subscriberInstance.subscribe).toHaveBeenCalledWith(
				"processing:events",
			)
			expect(subscriberInstance.on).toHaveBeenCalledWith(
				"message",
				expect.any(Function),
			)
		})
	})

	describe("addClient", () => {
		it("добавляет клиента и отправляет connected event", async () => {
			await service.onModuleInit()

			const mockResponse = {
				setHeader: vi.fn(),
				write: vi.fn(),
				on: vi.fn(),
				end: vi.fn(),
			}

			service.addClient("c1", "u1", mockResponse as any)

			expect(mockResponse.setHeader).toHaveBeenCalledWith(
				"Content-Type",
				"text/event-stream",
			)
			expect(mockResponse.setHeader).toHaveBeenCalledWith(
				"Cache-Control",
				"no-cache",
			)
			expect(mockResponse.write).toHaveBeenCalledWith(
				"event: connected\n",
			)
			expect(service.getActiveClientsCount()).toBe(1)
		})

		it("добавляет клиента с recordId", async () => {
			await service.onModuleInit()

			const mockResponse = {
				setHeader: vi.fn(),
				write: vi.fn(),
				on: vi.fn(),
				end: vi.fn(),
			}

			service.addClient("c1", "u1", mockResponse as any, "r1")

			const clients = service.getActiveClients()
			expect(clients).toHaveLength(1)
			expect(clients[0]).toEqual({
				id: "c1",
				userId: "u1",
				recordId: "r1",
			})
		})

		it("удаляет клиента при закрытии соединения", async () => {
			await service.onModuleInit()

			let closeHandler: () => void = () => {}
			const mockResponse = {
				setHeader: vi.fn(),
				write: vi.fn(),
				on: vi.fn((event: string, handler: () => void) => {
					if (event === "close") closeHandler = handler
				}),
				end: vi.fn(),
			}

			service.addClient("c1", "u1", mockResponse as any)
			expect(service.getActiveClientsCount()).toBe(1)

			closeHandler()
			expect(service.getActiveClientsCount()).toBe(0)
		})
	})

	describe("publishProcessingEvent", () => {
		it("публикует событие в Redis", async () => {
			await service.onModuleInit()

			await service.publishProcessingEvent(
				"r1",
				"u1",
				"started",
				{ progress: 0 },
			)

			expect(publisherInstance.publish).toHaveBeenCalledWith(
				"processing:events",
				expect.stringContaining('"type":"started"'),
			)
		})
	})

	describe("publishRawEvent", () => {
		it("публикует кастомное событие в Redis", async () => {
			await service.onModuleInit()

			await service.publishRawEvent({
				recordId: "system",
				userId: "u1",
				type: "shared-access:login",
				data: { accessId: "sa-1" },
				timestamp: new Date().toISOString(),
			})

			expect(publisherInstance.publish).toHaveBeenCalledWith(
				"processing:events",
				expect.stringContaining('"shared-access:login"'),
			)
		})
	})

	describe("getActiveClientsCount / getActiveClients", () => {
		it("возвращает 0 когда нет клиентов", () => {
			expect(service.getActiveClientsCount()).toBe(0)
			expect(service.getActiveClients()).toEqual([])
		})
	})

	describe("onModuleDestroy", () => {
		it("закрывает все клиенты и Redis соединения", async () => {
			await service.onModuleInit()

			const mockResponse = {
				setHeader: vi.fn(),
				write: vi.fn(),
				on: vi.fn(),
				end: vi.fn(),
			}
			service.addClient("c1", "u1", mockResponse as any)

			await service.onModuleDestroy()

			expect(mockResponse.end).toHaveBeenCalled()
			expect(subscriberInstance.quit).toHaveBeenCalled()
			expect(publisherInstance.quit).toHaveBeenCalled()
			expect(service.getActiveClientsCount()).toBe(0)
		})
	})
})
