import { Test, TestingModule } from "@nestjs/testing"
import { describe, it, expect, beforeEach, vi } from "vitest"
import { HttpException, HttpStatus } from "@nestjs/common"
import { ProcessingProxyController } from "./processing-proxy.controller"
import { HttpClientService } from "../common/http-client.service"

describe("ProcessingProxyController", () => {
	let controller: ProcessingProxyController

	const mockHttpClient = {
		get: vi.fn(),
		post: vi.fn(),
		put: vi.fn(),
		patch: vi.fn(),
		delete: vi.fn(),
	}

	const createReq = (
		method: string,
		url: string,
		opts?: { user?: { id: string }; body?: unknown },
	) =>
		({
			method,
			url,
			body: opts?.body,
			user: opts?.user,
		}) as any

	beforeEach(async () => {
		vi.clearAllMocks()

		const module: TestingModule = await Test.createTestingModule({
			controllers: [ProcessingProxyController],
			providers: [
				{ provide: HttpClientService, useValue: mockHttpClient },
			],
		}).compile()

		controller = module.get<ProcessingProxyController>(
			ProcessingProxyController,
		)
	})

	describe("healthCheck", () => {
		it("проксирует GET health к processing-service", async () => {
			const req = createReq("GET", "/api/processing/health")
			mockHttpClient.get.mockResolvedValue({ status: "ok" })

			const result = await controller.healthCheck(req)

			expect(mockHttpClient.get).toHaveBeenCalledWith(
				"processing",
				"/api/processing/health",
			)
			expect(result).toEqual({ status: "ok" })
		})
	})

	describe("proxyToProcessingService", () => {
		it("проксирует GET с x-user-id", async () => {
			const req = createReq("GET", "/api/processing/jobs", {
				user: { id: "u1" },
			})
			mockHttpClient.get.mockResolvedValue([])

			const result = await controller.proxyToProcessingService(req)

			expect(mockHttpClient.get).toHaveBeenCalledWith(
				"processing",
				"/api/processing/jobs",
				{ "x-user-id": "u1" },
			)
			expect(result).toEqual([])
		})

		it("проксирует POST с телом", async () => {
			const body = { recordId: "r1" }
			const req = createReq("POST", "/api/processing/start", {
				user: { id: "u1" },
				body,
			})
			mockHttpClient.post.mockResolvedValue({ jobId: "j1" })

			const result = await controller.proxyToProcessingService(req)

			expect(mockHttpClient.post).toHaveBeenCalledWith(
				"processing",
				"/api/processing/start",
				body,
				{ "x-user-id": "u1" },
			)
			expect(result).toEqual({ jobId: "j1" })
		})

		it("проксирует PUT", async () => {
			const body = { status: "retry" }
			const req = createReq("PUT", "/api/processing/jobs/j1", {
				user: { id: "u1" },
				body,
			})
			mockHttpClient.put.mockResolvedValue({ ok: true })

			const result = await controller.proxyToProcessingService(req)

			expect(mockHttpClient.put).toHaveBeenCalledWith(
				"processing",
				"/api/processing/jobs/j1",
				body,
				{ "x-user-id": "u1" },
			)
			expect(result).toEqual({ ok: true })
		})

		it("проксирует PATCH", async () => {
			const body = { priority: "high" }
			const req = createReq("PATCH", "/api/processing/jobs/j1", {
				user: { id: "u1" },
				body,
			})
			mockHttpClient.patch.mockResolvedValue({ ok: true })

			const result = await controller.proxyToProcessingService(req)

			expect(mockHttpClient.patch).toHaveBeenCalledWith(
				"processing",
				"/api/processing/jobs/j1",
				body,
				{ "x-user-id": "u1" },
			)
			expect(result).toEqual({ ok: true })
		})

		it("проксирует DELETE", async () => {
			const req = createReq("DELETE", "/api/processing/jobs/j1", {
				user: { id: "u1" },
			})
			mockHttpClient.delete.mockResolvedValue({ ok: true })

			const result = await controller.proxyToProcessingService(req)

			expect(mockHttpClient.delete).toHaveBeenCalledWith(
				"processing",
				"/api/processing/jobs/j1",
				{ "x-user-id": "u1" },
			)
			expect(result).toEqual({ ok: true })
		})

		it("выбрасывает METHOD_NOT_ALLOWED для неподдерживаемого метода", async () => {
			const req = createReq("HEAD", "/api/processing/jobs")

			await expect(
				controller.proxyToProcessingService(req),
			).rejects.toThrow(HttpException)
			await expect(
				controller.proxyToProcessingService(req),
			).rejects.toMatchObject({
				status: HttpStatus.METHOD_NOT_ALLOWED,
			})
		})

		it("не отправляет x-user-id если нет пользователя", async () => {
			const req = createReq("GET", "/api/processing/jobs")
			mockHttpClient.get.mockResolvedValue([])

			await controller.proxyToProcessingService(req)

			expect(mockHttpClient.get).toHaveBeenCalledWith(
				"processing",
				"/api/processing/jobs",
				{},
			)
		})
	})
})
