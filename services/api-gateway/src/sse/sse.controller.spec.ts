import { Test, TestingModule } from "@nestjs/testing"
import { describe, it, expect, beforeEach, vi } from "vitest"
import { SseController } from "./sse.controller"
import { SseService } from "./sse.service"

describe("SseController", () => {
	let controller: SseController

	const mockSseService = {
		addClient: vi.fn(),
		getActiveClientsCount: vi.fn().mockReturnValue(3),
		getActiveClients: vi.fn().mockReturnValue([
			{ id: "c1", userId: "u1" },
			{ id: "c2", userId: "u2" },
			{ id: "c3", userId: "u1", recordId: "r1" },
		]),
	}

	beforeEach(async () => {
		vi.clearAllMocks()

		const module: TestingModule = await Test.createTestingModule({
			controllers: [SseController],
			providers: [
				{ provide: SseService, useValue: mockSseService },
			],
		}).compile()

		controller = module.get<SseController>(SseController)
	})

	describe("streamAllProcessingEvents", () => {
		it("подключает SSE клиента для всех событий пользователя", () => {
			const reply = { raw: {} } as any
			const request = { user: { id: "u1" } } as any

			controller.streamAllProcessingEvents({}, reply, request)

			expect(mockSseService.addClient).toHaveBeenCalledWith(
				expect.any(String),
				"u1",
				reply.raw,
			)
		})
	})

	describe("streamRecordProcessingEvents", () => {
		it("подключает SSE клиента для событий конкретного record", () => {
			const reply = { raw: {} } as any
			const request = { user: { id: "u1" } } as any

			controller.streamRecordProcessingEvents(
				"r1",
				reply,
				request,
			)

			expect(mockSseService.addClient).toHaveBeenCalledWith(
				expect.any(String),
				"u1",
				reply.raw,
				"r1",
			)
		})
	})

	describe("getStats", () => {
		it("возвращает статистику активных подключений", () => {
			const result = controller.getStats()

			expect(result).toEqual({
				activeClients: 3,
				clients: [
					{ id: "c1", userId: "u1" },
					{ id: "c2", userId: "u2" },
					{ id: "c3", userId: "u1", recordId: "r1" },
				],
			})
		})
	})
})
