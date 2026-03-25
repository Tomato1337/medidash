import { Test, TestingModule } from "@nestjs/testing"
import { describe, it, expect, beforeEach, vi } from "vitest"
import { HttpException, HttpStatus } from "@nestjs/common"
import { SearchProxyController } from "./search-proxy.controller"
import { HttpClientService } from "../common/http-client.service"

describe("SearchProxyController", () => {
	let controller: SearchProxyController

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
		opts?: { body?: unknown },
	) =>
		({
			method,
			url,
			body: opts?.body,
		}) as any

	beforeEach(async () => {
		vi.clearAllMocks()

		const module: TestingModule = await Test.createTestingModule({
			controllers: [SearchProxyController],
			providers: [
				{ provide: HttpClientService, useValue: mockHttpClient },
			],
		}).compile()

		controller =
			module.get<SearchProxyController>(SearchProxyController)
	})

	describe("proxyToSearchService", () => {
		it("проксирует GET с перезаписью URL", async () => {
			const req = createReq("GET", "/api/search/query?q=test")
			mockHttpClient.get.mockResolvedValue({ results: [] })

			const result = await controller.proxyToSearchService(req)

			expect(mockHttpClient.get).toHaveBeenCalledWith(
				"search",
				"/api/search/query?q=test",
			)
			expect(result).toEqual({ results: [] })
		})

		it("проксирует POST с телом", async () => {
			const body = { query: "анализ крови", limit: 10 }
			const req = createReq("POST", "/api/search/semantic", {
				body,
			})
			mockHttpClient.post.mockResolvedValue({ results: [] })

			const result = await controller.proxyToSearchService(req)

			expect(mockHttpClient.post).toHaveBeenCalledWith(
				"search",
				"/api/search/semantic",
				body,
			)
			expect(result).toEqual({ results: [] })
		})

		it("проксирует PUT", async () => {
			const body = { index: "updated" }
			const req = createReq("PUT", "/api/search/index/idx1", {
				body,
			})
			mockHttpClient.put.mockResolvedValue({ ok: true })

			const result = await controller.proxyToSearchService(req)

			expect(mockHttpClient.put).toHaveBeenCalledWith(
				"search",
				"/api/search/index/idx1",
				body,
			)
			expect(result).toEqual({ ok: true })
		})

		it("проксирует PATCH", async () => {
			const body = { field: "value" }
			const req = createReq("PATCH", "/api/search/settings", {
				body,
			})
			mockHttpClient.patch.mockResolvedValue({ ok: true })

			const result = await controller.proxyToSearchService(req)

			expect(mockHttpClient.patch).toHaveBeenCalledWith(
				"search",
				"/api/search/settings",
				body,
			)
			expect(result).toEqual({ ok: true })
		})

		it("проксирует DELETE", async () => {
			const req = createReq("DELETE", "/api/search/index/idx1")
			mockHttpClient.delete.mockResolvedValue({ ok: true })

			const result = await controller.proxyToSearchService(req)

			expect(mockHttpClient.delete).toHaveBeenCalledWith(
				"search",
				"/api/search/index/idx1",
			)
			expect(result).toEqual({ ok: true })
		})

		it("выбрасывает METHOD_NOT_ALLOWED для неподдерживаемого метода", async () => {
			const req = createReq("OPTIONS", "/api/search/query")

			await expect(
				controller.proxyToSearchService(req),
			).rejects.toThrow(HttpException)
			await expect(
				controller.proxyToSearchService(req),
			).rejects.toMatchObject({
				status: HttpStatus.METHOD_NOT_ALLOWED,
			})
		})

		it("корректно обрабатывает URL без дополнительного пути", async () => {
			const req = createReq("GET", "/api/search")
			mockHttpClient.get.mockResolvedValue({})

			await controller.proxyToSearchService(req)

			// /api/search -> path="" -> url="/api/search"
			expect(mockHttpClient.get).toHaveBeenCalledWith(
				"search",
				"/api/search",
			)
		})
	})
})
