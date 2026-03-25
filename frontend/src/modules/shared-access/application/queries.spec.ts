import { describe, it, expect, vi } from "vitest"
import {
	sharedAccessListQueryOptions,
	sharedAccessSessionsQueryOptions,
} from "./queries"
import { queryKeys } from "@/shared/api/queries"

vi.mock("../infrastructure/sharedAccessApi", () => ({
	listSharedAccesses: vi.fn(),
	listSharedAccessSessions: vi.fn(),
}))

describe("shared-access query options", () => {
	// =========================================================================
	// sharedAccessListQueryOptions
	// =========================================================================

	describe("sharedAccessListQueryOptions", () => {
		it("возвращает правильный queryKey", () => {
			const options = sharedAccessListQueryOptions()
			expect(options.queryKey).toEqual(queryKeys.sharedAccess.list())
		})

		it("имеет queryFn", () => {
			const options = sharedAccessListQueryOptions()
			expect(options.queryFn).toBeDefined()
			expect(typeof options.queryFn).toBe("function")
		})
	})

	// =========================================================================
	// sharedAccessSessionsQueryOptions
	// =========================================================================

	describe("sharedAccessSessionsQueryOptions", () => {
		it("возвращает правильный queryKey с accessId", () => {
			const options = sharedAccessSessionsQueryOptions("access-123")
			expect(options.queryKey).toEqual(
				queryKeys.sharedAccess.sessions("access-123"),
			)
		})

		it("enabled = true при непустом accessId", () => {
			const options = sharedAccessSessionsQueryOptions("access-123")
			expect(options.enabled).toBe(true)
		})

		it("enabled = false при пустом accessId", () => {
			const options = sharedAccessSessionsQueryOptions("")
			expect(options.enabled).toBe(false)
		})

		it("имеет queryFn", () => {
			const options = sharedAccessSessionsQueryOptions("access-123")
			expect(options.queryFn).toBeDefined()
			expect(typeof options.queryFn).toBe("function")
		})
	})
})
