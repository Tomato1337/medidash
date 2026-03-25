import { Test, TestingModule } from "@nestjs/testing"
import { describe, it, expect, beforeEach, vi } from "vitest"
import { HttpException, HttpStatus } from "@nestjs/common"
import { DocumentProxyController } from "./document-proxy.controller"
import { HttpClientService } from "../common/http-client.service"

describe("DocumentProxyController", () => {
	let controller: DocumentProxyController

	const mockHttpClient = {
		get: vi.fn(),
		post: vi.fn(),
		postRaw: vi.fn(),
		put: vi.fn(),
		patch: vi.fn(),
		delete: vi.fn(),
	}

	const createReq = (
		method: string,
		url: string,
		opts?: {
			user?: { id: string }
			body?: unknown
			contentType?: string
			raw?: unknown
		},
	) =>
		({
			method,
			url,
			body: opts?.body,
			raw: opts?.raw ?? {},
			user: opts?.user,
			headers: {
				"content-type": opts?.contentType ?? "application/json",
			},
		}) as any

	beforeEach(async () => {
		vi.clearAllMocks()

		const module: TestingModule = await Test.createTestingModule({
			controllers: [DocumentProxyController],
			providers: [
				{ provide: HttpClientService, useValue: mockHttpClient },
			],
		}).compile()

		controller = module.get<DocumentProxyController>(
			DocumentProxyController,
		)
	})

	describe("proxyTags", () => {
		it("проксирует GET запрос к тегам", async () => {
			const req = createReq("GET", "/api/tags")
			mockHttpClient.get.mockResolvedValue([{ id: "t1" }])

			const result = await controller.proxyTags(req)

			expect(mockHttpClient.get).toHaveBeenCalledWith(
				"document",
				"/api/tags",
				{},
			)
			expect(result).toEqual([{ id: "t1" }])
		})
	})

	describe("proxyDocuments", () => {
		it("проксирует GET с x-user-id заголовком", async () => {
			const req = createReq("GET", "/api/records", {
				user: { id: "u1" },
			})
			mockHttpClient.get.mockResolvedValue({ data: [] })

			const result = await controller.proxyDocuments(req)

			expect(mockHttpClient.get).toHaveBeenCalledWith(
				"document",
				"/api/records",
				{ "x-user-id": "u1" },
			)
			expect(result).toEqual({ data: [] })
		})

		it("проксирует POST JSON", async () => {
			const body = { title: "Запись" }
			const req = createReq("POST", "/api/records", {
				user: { id: "u1" },
				body,
			})
			mockHttpClient.post.mockResolvedValue({ id: "r1" })

			const result = await controller.proxyDocuments(req)

			expect(mockHttpClient.post).toHaveBeenCalledWith(
				"document",
				"/api/records",
				body,
				{ "x-user-id": "u1" },
			)
			expect(result).toEqual({ id: "r1" })
		})

		it("проксирует POST multipart через postRaw", async () => {
			const rawBody = Buffer.from("file-data")
			const req = createReq("POST", "/api/documents", {
				user: { id: "u1" },
				body: rawBody,
				contentType:
					"multipart/form-data; boundary=----FormBoundary",
				raw: rawBody,
			})
			mockHttpClient.postRaw.mockResolvedValue({ id: "d1" })

			const result = await controller.proxyDocuments(req)

			expect(mockHttpClient.postRaw).toHaveBeenCalledWith(
				"document",
				"/api/documents",
				rawBody,
				{
					"x-user-id": "u1",
					"content-type":
						"multipart/form-data; boundary=----FormBoundary",
				},
			)
			expect(result).toEqual({ id: "d1" })
		})

		it("проксирует PUT", async () => {
			const body = { title: "Обновлённая" }
			const req = createReq("PUT", "/api/records/r1", {
				user: { id: "u1" },
				body,
			})
			mockHttpClient.put.mockResolvedValue({ ok: true })

			const result = await controller.proxyDocuments(req)

			expect(mockHttpClient.put).toHaveBeenCalledWith(
				"document",
				"/api/records/r1",
				body,
				{ "x-user-id": "u1" },
			)
			expect(result).toEqual({ ok: true })
		})

		it("проксирует PATCH", async () => {
			const body = { title: "Частично" }
			const req = createReq("PATCH", "/api/records/r1", {
				user: { id: "u1" },
				body,
			})
			mockHttpClient.patch.mockResolvedValue({ ok: true })

			const result = await controller.proxyDocuments(req)

			expect(mockHttpClient.patch).toHaveBeenCalledWith(
				"document",
				"/api/records/r1",
				body,
				{ "x-user-id": "u1" },
			)
			expect(result).toEqual({ ok: true })
		})

		it("проксирует DELETE", async () => {
			const req = createReq("DELETE", "/api/records/r1", {
				user: { id: "u1" },
			})
			mockHttpClient.delete.mockResolvedValue({ ok: true })

			const result = await controller.proxyDocuments(req)

			expect(mockHttpClient.delete).toHaveBeenCalledWith(
				"document",
				"/api/records/r1",
				{ "x-user-id": "u1" },
			)
			expect(result).toEqual({ ok: true })
		})

		it("выбрасывает METHOD_NOT_ALLOWED для неподдерживаемого метода", async () => {
			const req = createReq("OPTIONS", "/api/records")

			await expect(controller.proxyDocuments(req)).rejects.toThrow(
				HttpException,
			)
			await expect(
				controller.proxyDocuments(req),
			).rejects.toMatchObject({
				status: HttpStatus.METHOD_NOT_ALLOWED,
			})
		})

		it("не отправляет x-user-id если нет пользователя", async () => {
			const req = createReq("GET", "/api/records")
			mockHttpClient.get.mockResolvedValue([])

			await controller.proxyDocuments(req)

			expect(mockHttpClient.get).toHaveBeenCalledWith(
				"document",
				"/api/records",
				{},
			)
		})
	})
})
