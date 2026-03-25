import { describe, it, expect, vi } from "vitest"
import { HttpException, HttpStatus } from "@nestjs/common"
import { AllExceptionsFilter } from "./all-exceptions.filter"

describe("AllExceptionsFilter", () => {
	const filter = new AllExceptionsFilter()

	const createHost = () => {
		const send = vi.fn()
		const status = vi.fn().mockReturnValue({ send })
		const reply = { status }
		const request = { method: "GET", url: "/api/test" }
		const host = {
			switchToHttp: () => ({
				getResponse: () => reply,
				getRequest: () => request,
			}),
		} as any
		return { host, reply, request, send, status }
	}

	it("handles HttpException with string response", () => {
		const { host, status, send } = createHost()

		filter.catch(
			new HttpException("Not Found", HttpStatus.NOT_FOUND),
			host,
		)

		expect(status).toHaveBeenCalledWith(404)
		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({
				statusCode: 404,
				message: "Not Found",
				path: "/api/test",
				method: "GET",
			}),
		)
	})

	it("handles HttpException with object response", () => {
		const { host, status, send } = createHost()

		filter.catch(
			new HttpException(
				{ message: "Validation failed", error: "Bad Request" },
				HttpStatus.BAD_REQUEST,
			),
			host,
		)

		expect(status).toHaveBeenCalledWith(400)
		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({
				statusCode: 400,
				message: "Validation failed",
				error: "Bad Request",
			}),
		)
	})

	it("handles HttpException with array message", () => {
		const { host, send } = createHost()

		filter.catch(
			new HttpException(
				{ message: ["field1 required", "field2 invalid"] },
				HttpStatus.BAD_REQUEST,
			),
			host,
		)

		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({
				message: ["field1 required", "field2 invalid"],
			}),
		)
	})

	it("handles generic Error with 500 status", () => {
		const { host, status, send } = createHost()

		filter.catch(new TypeError("Cannot read property"), host)

		expect(status).toHaveBeenCalledWith(500)
		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({
				statusCode: 500,
				message: "Cannot read property",
				error: "TypeError",
			}),
		)
	})

	it("handles unknown non-Error exceptions with defaults", () => {
		const { host, status, send } = createHost()

		filter.catch("something unexpected", host)

		expect(status).toHaveBeenCalledWith(500)
		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({
				statusCode: 500,
				message: "Internal server error",
				error: "Internal Server Error",
			}),
		)
	})

	it("includes timestamp in response", () => {
		const { host, send } = createHost()

		filter.catch(new Error("boom"), host)

		const body = send.mock.calls[0][0]
		expect(body.timestamp).toBeDefined()
		expect(() => new Date(body.timestamp)).not.toThrow()
	})
})
