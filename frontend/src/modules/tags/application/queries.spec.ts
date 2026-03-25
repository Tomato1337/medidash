import { describe, it, expect, vi } from "vitest"
import { tagsQueryOptions } from "./queries"
import { queryKeys } from "@/shared/api/queries"

vi.mock("../infrastructure/tagsApi", () => ({
	getTags: vi.fn(),
}))

describe("tags query options", () => {
	describe("tagsQueryOptions", () => {
		it("возвращает правильный queryKey", () => {
			expect(tagsQueryOptions.queryKey).toEqual(queryKeys.tags.all())
		})

		it("имеет staleTime = 5 минут", () => {
			expect(tagsQueryOptions.staleTime).toBe(1000 * 60 * 5)
		})

		it("имеет queryFn", () => {
			expect(tagsQueryOptions.queryFn).toBeDefined()
			expect(typeof tagsQueryOptions.queryFn).toBe("function")
		})
	})
})
