import { describe, it, expect, vi } from "vitest"
import { CallHandler, ExecutionContext } from "@nestjs/common"
import { of } from "rxjs"
import { UserContextInterceptor } from "./user-context.interceptor"

describe("UserContextInterceptor", () => {
	const interceptor = new UserContextInterceptor()

	const createContext = (user?: { id: string }): ExecutionContext => {
		const request = {
			user,
			headers: {} as Record<string, string>,
		}
		return {
			switchToHttp: () => ({
				getRequest: () => request,
			}),
		} as unknown as ExecutionContext
	}

	const nextHandler: CallHandler = {
		handle: () => of("response"),
	}

	it("sets x-user-id header when user is present", () => {
		const ctx = createContext({ id: "user-42" })
		interceptor.intercept(ctx, nextHandler)

		const req = ctx.switchToHttp().getRequest()
		expect(req.headers["x-user-id"]).toBe("user-42")
	})

	it("does not set header when user is absent", () => {
		const ctx = createContext(undefined)
		interceptor.intercept(ctx, nextHandler)

		const req = ctx.switchToHttp().getRequest()
		expect(req.headers["x-user-id"]).toBeUndefined()
	})

	it("returns next.handle() observable", () =>
		new Promise<void>((resolve) => {
			const ctx = createContext({ id: "user-1" })
			const result$ = interceptor.intercept(ctx, nextHandler)

			result$.subscribe({
				next: (value) => {
					expect(value).toBe("response")
				},
				complete: () => {
					resolve()
				},
			})
		}))
})
