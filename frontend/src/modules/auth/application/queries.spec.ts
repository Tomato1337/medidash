import { describe, it, expect, vi } from "vitest"
import {
	userQueryOptions,
	loginMutationOptions,
	registerMutationOptions,
	logoutMutationOptions,
} from "./queries"
import { queryKeys, mutationKeys } from "@/shared/api/queries"

vi.mock("../infrastructure/authApi", () => ({
	getUser: vi.fn(),
	login: vi.fn(),
	register: vi.fn(),
	logout: vi.fn(),
}))

describe("auth query options", () => {
	// =========================================================================
	// userQueryOptions
	// =========================================================================

	describe("userQueryOptions", () => {
		it("возвращает правильный queryKey", () => {
			const options = userQueryOptions()
			expect(options.queryKey).toEqual(queryKeys.auth.user())
		})

		it("по умолчанию enabled = true", () => {
			const options = userQueryOptions()
			expect(options.enabled).toBe(true)
		})

		it("позволяет отключить запрос через enabled = false", () => {
			const options = userQueryOptions(false)
			expect(options.enabled).toBe(false)
		})

		it("по умолчанию skipGlobalErrorHandler = false", () => {
			const options = userQueryOptions()
			expect(options.meta?.skipGlobalErrorHandler).toBe(false)
		})

		it("устанавливает skipGlobalErrorHandler через параметр", () => {
			const options = userQueryOptions(true, true)
			expect(options.meta?.skipGlobalErrorHandler).toBe(true)
		})

		it("имеет queryFn", () => {
			const options = userQueryOptions()
			expect(options.queryFn).toBeDefined()
			expect(typeof options.queryFn).toBe("function")
		})
	})

	// =========================================================================
	// loginMutationOptions
	// =========================================================================

	describe("loginMutationOptions", () => {
		it("возвращает правильный mutationKey", () => {
			const options = loginMutationOptions()
			expect(options.mutationKey).toEqual(mutationKeys.auth.login)
		})

		it("имеет mutationFn", () => {
			const options = loginMutationOptions()
			expect(options.mutationFn).toBeDefined()
			expect(typeof options.mutationFn).toBe("function")
		})
	})

	// =========================================================================
	// registerMutationOptions
	// =========================================================================

	describe("registerMutationOptions", () => {
		it("возвращает правильный mutationKey", () => {
			const options = registerMutationOptions()
			expect(options.mutationKey).toEqual(mutationKeys.auth.register)
		})

		it("имеет mutationFn", () => {
			const options = registerMutationOptions()
			expect(options.mutationFn).toBeDefined()
			expect(typeof options.mutationFn).toBe("function")
		})
	})

	// =========================================================================
	// logoutMutationOptions
	// =========================================================================

	describe("logoutMutationOptions", () => {
		it("возвращает правильный mutationKey", () => {
			const options = logoutMutationOptions()
			expect(options.mutationKey).toEqual(mutationKeys.auth.logout)
		})

		it("имеет mutationFn", () => {
			const options = logoutMutationOptions()
			expect(options.mutationFn).toBeDefined()
			expect(typeof options.mutationFn).toBe("function")
		})
	})
})
