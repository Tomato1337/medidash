import { describe, it, expect, vi, beforeEach } from "vitest"
import { getTags } from "./tagsApi"

vi.mock("@/shared/api/api", () => ({
	client: {
		GET: vi.fn(),
	},
}))

import { client } from "@/shared/api/api"

describe("tagsApi", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe("getTags", () => {
		it("возвращает список тегов", async () => {
			const mockData = [
				{ id: "t1", name: "Анализы" },
				{ id: "t2", name: "МРТ" },
			]
			vi.mocked(client.GET).mockResolvedValue({
				data: mockData,
				error: undefined,
				response: { ok: true },
			} as any)

			const result = await getTags()

			expect(client.GET).toHaveBeenCalledWith("/api/tags")
			expect(result).toEqual(mockData)
		})

		it("выбрасывает ошибку при неудачном ответе", async () => {
			vi.mocked(client.GET).mockResolvedValue({
				data: undefined,
				error: { message: "Server error" },
				response: { ok: false },
			} as any)

			await expect(getTags()).rejects.toThrow("Server error")
		})

		it("выбрасывает fallback ошибку если error не имеет message", async () => {
			vi.mocked(client.GET).mockResolvedValue({
				data: undefined,
				error: {},
				response: { ok: false },
			} as any)

			await expect(getTags()).rejects.toThrow(
				"Failed to fetch tags",
			)
		})
	})
})
