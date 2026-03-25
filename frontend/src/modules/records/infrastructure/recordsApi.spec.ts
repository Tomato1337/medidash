import { describe, it, expect, vi, beforeEach } from "vitest"
import { getRecord, getRecords } from "./recordsApi"

vi.mock("@/shared/api/api", () => ({
	client: {
		GET: vi.fn(),
	},
}))

import { client } from "@/shared/api/api"

describe("recordsApi", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe("getRecord", () => {
		it("возвращает запись по ID", async () => {
			const mockData = { id: "r1", title: "Анализ" }
			vi.mocked(client.GET).mockResolvedValue({
				data: mockData,
				error: undefined,
			} as any)

			const result = await getRecord("r1")

			expect(client.GET).toHaveBeenCalledWith("/api/records/{id}", {
				params: { path: { id: "r1" } },
			})
			expect(result).toEqual(mockData)
		})

		it("выбрасывает ошибку при наличии error", async () => {
			vi.mocked(client.GET).mockResolvedValue({
				data: undefined,
				error: { message: "Not found" },
			} as any)

			await expect(getRecord("bad-id")).rejects.toEqual({
				message: "Not found",
			})
		})
	})

	describe("getRecords", () => {
		it("возвращает список записей с пагинацией по умолчанию", async () => {
			const mockData = {
				data: [{ id: "r1" }],
				page: 1,
				limit: 10,
				total: 1,
			}
			vi.mocked(client.GET).mockResolvedValue({
				data: mockData,
				error: undefined,
			} as any)

			const result = await getRecords()

			expect(client.GET).toHaveBeenCalledWith("/api/records", {
				params: {
					query: { page: 1, limit: 10 },
				},
			})
			expect(result).toEqual(mockData)
		})

		it("передаёт фильтры поиска", async () => {
			const mockData = { data: [], page: 1, limit: 10, total: 0 }
			vi.mocked(client.GET).mockResolvedValue({
				data: mockData,
				error: undefined,
			} as any)

			await getRecords({
				search: "кровь",
				sortBy: "title",
				sortDir: "asc",
				dateFrom: "2024-01-01",
				dateTo: "2024-12-31",
				tags: ["t1", "t2"],
				status: ["completed"],
			})

			expect(client.GET).toHaveBeenCalledWith("/api/records", {
				params: {
					query: {
						page: 1,
						limit: 10,
						search: "кровь",
						sortBy: "title",
						sortDir: "asc",
						dateFrom: "2024-01-01",
						dateTo: "2024-12-31",
						tags: "t1,t2",
						status: "completed",
					},
				},
			})
		})

		it("не включает пустые фильтры", async () => {
			const mockData = { data: [], page: 1, limit: 10, total: 0 }
			vi.mocked(client.GET).mockResolvedValue({
				data: mockData,
				error: undefined,
			} as any)

			await getRecords({
				search: "  ",
				sortBy: "date",
				sortDir: "desc",
				tags: [],
				status: [],
			})

			// search=" " трим → пусто, sortBy="date" → пропуск, sortDir="desc" → пропуск
			expect(client.GET).toHaveBeenCalledWith("/api/records", {
				params: {
					query: { page: 1, limit: 10 },
				},
			})
		})

		it("выбрасывает ошибку если data отсутствует", async () => {
			vi.mocked(client.GET).mockResolvedValue({
				data: undefined,
				error: undefined,
			} as any)

			await expect(getRecords()).rejects.toThrow(
				"No data returned",
			)
		})
	})
})
