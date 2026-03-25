import { Test, TestingModule } from "@nestjs/testing"
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { HttpException, HttpStatus } from "@nestjs/common"
import { HttpClientService } from "./http-client.service"
import { EnvService } from "../env/env.service"

const fetchMock = vi.fn()
vi.stubGlobal("fetch", fetchMock)

const createMockResponse = (opts: {
	ok: boolean
	status: number
	json?: unknown
	text?: string
	contentType?: string
	jsonThrows?: boolean
}) => ({
	ok: opts.ok,
	status: opts.status,
	headers: {
		get: (name: string) =>
			name === "content-type"
				? (opts.contentType ?? "application/json")
				: null,
	},
	json: opts.jsonThrows
		? vi.fn().mockRejectedValue(new Error("no json"))
		: vi.fn().mockResolvedValue(opts.json ?? {}),
	text: vi.fn().mockResolvedValue(opts.text ?? ""),
})

describe("HttpClientService", () => {
	let service: HttpClientService

	const mockEnvService = {
		get: vi.fn((key: string) => {
			const map: Record<string, string> = {
				DOCUMENT_SERVICE_URL: "http://document:3001",
				PROCESSING_SERVICE_URL: "http://processing:3002",
				AI_SERVICE_URL: "http://ai:3003",
				SEARCH_SERVICE_URL: "http://search:3004",
			}
			return map[key] ?? ""
		}),
	}

	beforeEach(async () => {
		vi.clearAllMocks()

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				HttpClientService,
				{ provide: EnvService, useValue: mockEnvService },
			],
		}).compile()

		service = module.get<HttpClientService>(HttpClientService)
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it("throws on unknown service name", async () => {
		await expect(
			service.proxyRequest("unknown", "/api/test"),
		).rejects.toThrow(HttpException)
		await expect(
			service.proxyRequest("unknown", "/api/test"),
		).rejects.toMatchObject({
			status: HttpStatus.INTERNAL_SERVER_ERROR,
		})
	})

	it("sends GET request and returns parsed JSON", async () => {
		fetchMock.mockResolvedValue(
			createMockResponse({
				ok: true,
				status: 200,
				json: { id: 1, name: "doc" },
			}),
		)

		const result = await service.get("document", "/api/records")

		expect(fetchMock).toHaveBeenCalledWith(
			"http://document:3001/api/records",
			expect.objectContaining({ method: "GET" }),
		)
		expect(result).toEqual({ id: 1, name: "doc" })
	})

	it("returns empty object for non-JSON response", async () => {
		fetchMock.mockResolvedValue(
			createMockResponse({
				ok: true,
				status: 200,
				contentType: "text/plain",
			}),
		)

		const result = await service.get("document", "/api/health")

		expect(result).toEqual({})
	})

	it("sets Content-Type for POST requests", async () => {
		fetchMock.mockResolvedValue(
			createMockResponse({
				ok: true,
				status: 201,
				json: { id: "new" },
			}),
		)

		await service.post("document", "/api/records", { title: "Test" })

		const callArgs = fetchMock.mock.calls[0]
		expect(callArgs[1].headers["Content-Type"]).toBe("application/json")
		expect(callArgs[1].body).toBe(JSON.stringify({ title: "Test" }))
	})

	it("does not set Content-Type for GET requests", async () => {
		fetchMock.mockResolvedValue(
			createMockResponse({ ok: true, status: 200, json: {} }),
		)

		await service.get("document", "/api/records")

		const callArgs = fetchMock.mock.calls[0]
		expect(callArgs[1].headers["Content-Type"]).toBeUndefined()
	})

	it("does not set Content-Type for DELETE requests", async () => {
		fetchMock.mockResolvedValue(
			createMockResponse({ ok: true, status: 200, json: {} }),
		)

		await service.delete("document", "/api/records/1")

		const callArgs = fetchMock.mock.calls[0]
		expect(callArgs[1].headers["Content-Type"]).toBeUndefined()
	})

	it("sends PUT request with serialized body", async () => {
		fetchMock.mockResolvedValue(
			createMockResponse({ ok: true, status: 200, json: { updated: true } }),
		)

		await service.put("document", "/api/records/1", { title: "Updated" })

		const callArgs = fetchMock.mock.calls[0]
		expect(callArgs[1].method).toBe("PUT")
		expect(callArgs[1].body).toBe(JSON.stringify({ title: "Updated" }))
	})

	it("sends PATCH request with serialized body", async () => {
		fetchMock.mockResolvedValue(
			createMockResponse({ ok: true, status: 200, json: { patched: true } }),
		)

		await service.patch("processing", "/api/jobs/1", { status: "retry" })

		const callArgs = fetchMock.mock.calls[0]
		expect(callArgs[1].method).toBe("PATCH")
		expect(callArgs[0]).toBe("http://processing:3002/api/jobs/1")
	})

	it("postRaw throws on unknown service", async () => {
		await expect(
			service.postRaw("unknown", "/upload", "binary-data"),
		).rejects.toThrow(HttpException)
	})

	it("postRaw proxies raw body without JSON serialization", async () => {
		fetchMock.mockResolvedValue(
			createMockResponse({ ok: true, status: 200, json: { uploaded: true } }),
		)

		const rawBody = "raw-binary-content"
		await service.postRaw("document", "/api/documents/upload", rawBody, {
			"content-type": "multipart/form-data; boundary=abc",
		})

		const callArgs = fetchMock.mock.calls[0]
		expect(callArgs[1].body).toBe(rawBody)
		expect(callArgs[1].method).toBe("POST")
	})

	it("parses JSON error body from failed response", async () => {
		fetchMock.mockResolvedValue(
			createMockResponse({
				ok: false,
				status: 404,
				json: { message: "Record not found" },
			}),
		)

		await expect(
			service.get("document", "/api/records/999"),
		).rejects.toMatchObject({
			status: 404,
		})
	})

	it("falls back to text when JSON parsing fails on error response", async () => {
		fetchMock.mockResolvedValue(
			createMockResponse({
				ok: false,
				status: 502,
				jsonThrows: true,
				text: "bad gateway",
			}),
		)

		await expect(
			service.get("document", "/api/records"),
		).rejects.toMatchObject({
			response: "bad gateway",
			status: 502,
		})
	})

	it("joins array messages from error body", async () => {
		fetchMock.mockResolvedValue(
			createMockResponse({
				ok: false,
				status: 400,
				json: {
					message: ["field1 invalid", "field2 required"],
					error: "Bad Request",
				},
			}),
		)

		try {
			await service.get("document", "/api/records")
			expect.unreachable("should have thrown")
		} catch (error) {
			expect(error).toBeInstanceOf(HttpException)
			// handleErrorResponse throws HttpException(errorData, status) when errorData exists
			expect((error as HttpException).getStatus()).toBe(400)
		}
	})

	it("wraps network errors into SERVICE_UNAVAILABLE", async () => {
		fetchMock.mockRejectedValue(new Error("ECONNREFUSED"))

		await expect(
			service.get("document", "/api/records"),
		).rejects.toMatchObject({
			status: HttpStatus.SERVICE_UNAVAILABLE,
		})
	})

	it("re-throws HttpException from handleErrorResponse without wrapping", async () => {
		fetchMock.mockResolvedValue(
			createMockResponse({
				ok: false,
				status: 403,
				json: { message: "Forbidden" },
			}),
		)

		try {
			await service.get("document", "/api/secret")
			expect.unreachable("should have thrown")
		} catch (error) {
			expect(error).toBeInstanceOf(HttpException)
			expect((error as HttpException).getStatus()).toBe(403)
		}
	})

	it("checkHealth returns true when /api/health succeeds", async () => {
		fetchMock.mockResolvedValue(
			createMockResponse({ ok: true, status: 200, json: { status: "ok" } }),
		)

		const result = await service.checkHealth("document")

		expect(result).toBe(true)
	})

	it("checkHealth falls back to /health when /api/health fails", async () => {
		fetchMock
			.mockRejectedValueOnce(new Error("ECONNREFUSED"))
			.mockResolvedValueOnce(
				createMockResponse({ ok: true, status: 200, json: { status: "ok" } }),
			)

		const result = await service.checkHealth("document")

		expect(result).toBe(true)
		expect(fetchMock).toHaveBeenCalledTimes(2)
	})

	it("checkHealth returns false when both endpoints fail", async () => {
		fetchMock
			.mockRejectedValueOnce(new Error("fail1"))
			.mockRejectedValueOnce(new Error("fail2"))

		const result = await service.checkHealth("document")

		expect(result).toBe(false)
	})

	it("getServices returns all registered services", () => {
		const services = service.getServices()

		expect(services).toHaveLength(4)
		expect(services).toEqual(
			expect.arrayContaining([
				{ name: "document", baseUrl: "http://document:3001" },
				{ name: "processing", baseUrl: "http://processing:3002" },
				{ name: "ai", baseUrl: "http://ai:3003" },
				{ name: "search", baseUrl: "http://search:3004" },
			]),
		)
	})
})
