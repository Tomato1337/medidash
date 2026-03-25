import { describe, it, expect, vi, beforeEach } from "vitest"
import { recordQueryOptions, recordsInfiniteQueryOptions } from "./queries"
import { queryKeys } from "@/shared/api/queries"
import { getRecord, getRecords } from "../infrastructure/recordsApi"
import { db } from "@/shared/lib/indexedDB"
import type { RecordsFilters } from "../domain/types"

vi.mock("../infrastructure/recordsApi", () => ({
	getRecord: vi.fn(),
	getRecords: vi.fn(),
}))

vi.mock("@/shared/lib/indexedDB", () => ({
	db: {
		records: {
			toArray: vi.fn(),
		},
	},
}))

describe("records query options", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	// =========================================================================
	// recordQueryOptions
	// =========================================================================

	describe("recordQueryOptions", () => {
		it("возвращает правильный queryKey с id", () => {
			const options = recordQueryOptions("rec-123")
			expect(options.queryKey).toEqual(queryKeys.records.detail("rec-123"))
		})

		it("имеет queryFn", () => {
			const options = recordQueryOptions("rec-123")
			expect(options.queryFn).toBeDefined()
			expect(typeof options.queryFn).toBe("function")
		})

		it("queryFn вызывает getRecord и нормализует результат", async () => {
			const serverRecord = {
				id: "rec-123",
				title: "Test",
				status: "COMPLETED",
				documentCount: 1,
				documents: [],
				tags: [],
				createdAt: "2026-01-01T00:00:00Z",
				updatedAt: "2026-01-01T00:00:00Z",
			}
			vi.mocked(getRecord).mockResolvedValue(serverRecord as any)

			const options = recordQueryOptions("rec-123")
			const result = await options.queryFn!({} as any)

			expect(getRecord).toHaveBeenCalledWith("rec-123")
			expect(result).toBeDefined()
			expect(result.id).toBe("rec-123")
		})
	})

	// =========================================================================
	// recordsInfiniteQueryOptions
	// =========================================================================

	describe("recordsInfiniteQueryOptions", () => {
		it("возвращает правильный queryKey без фильтров", () => {
			const options = recordsInfiniteQueryOptions()
			expect(options.queryKey).toEqual(queryKeys.records.infinite(undefined))
		})

		it("возвращает правильный queryKey с фильтрами", () => {
			const filters: RecordsFilters = { search: "test" }
			const options = recordsInfiniteQueryOptions(filters)
			expect(options.queryKey).toEqual(
				queryKeys.records.infinite(filters),
			)
		})

		it("initialPageParam = 1", () => {
			const options = recordsInfiniteQueryOptions()
			expect(options.initialPageParam).toBe(1)
		})

		it("имеет queryFn", () => {
			const options = recordsInfiniteQueryOptions()
			expect(options.queryFn).toBeDefined()
		})

		// =====================================================================
		// queryFn — первая страница с локальными записями
		// =====================================================================

		it("queryFn на первой странице мержит локальные записи", async () => {
			const serverData = {
				data: [
					{
						id: "server-1",
						title: "Server Record",
						status: "COMPLETED",
						documentCount: 1,
						documents: [],
						tags: ["tag1"],
						createdAt: "2026-01-01T00:00:00Z",
						updatedAt: "2026-01-01T00:00:00Z",
					},
				],
				page: 1,
				limit: 10,
				total: 1,
			}
			vi.mocked(getRecords).mockResolvedValue(serverData as any)

			const localRecords = [
				{
					id: "local-1",
					isLocal: true,
					title: "Local Record",
					status: "PENDING",
					documentCount: 0,
					documents: [],
					tags: [],
					createdAt: Date.now(),
					updatedAt: Date.now(),
					syncStatus: "pending",
					retryCount: 0,
				},
			]
			vi.mocked(db.records.toArray).mockResolvedValue(
				localRecords as any,
			)

			const options = recordsInfiniteQueryOptions()
			const result = await options.queryFn!({
				pageParam: 1,
			} as any)

			expect(result.data).toHaveLength(2)
			// Локальные записи идут первыми
			expect(result.data[0].isLocal).toBe(true)
			expect(result.data[1].isLocal).toBe(false)
			expect(result.localCount).toBe(1)
			expect(result.total).toBe(2) // 1 server + 1 local
		})

		it("queryFn исключает дубликаты (локальная запись уже на сервере)", async () => {
			const serverData = {
				data: [
					{
						id: "shared-id",
						title: "Server Record",
						status: "COMPLETED",
						documentCount: 1,
						documents: [],
						tags: [],
						createdAt: "2026-01-01T00:00:00Z",
						updatedAt: "2026-01-01T00:00:00Z",
					},
				],
				page: 1,
				limit: 10,
				total: 1,
			}
			vi.mocked(getRecords).mockResolvedValue(serverData as any)

			const localRecords = [
				{
					id: "shared-id", // тот же id
					isLocal: true,
					title: "Local Record",
					status: "PENDING",
					documentCount: 0,
					documents: [],
					tags: [],
					createdAt: Date.now(),
					updatedAt: Date.now(),
					syncStatus: "pending",
					retryCount: 0,
				},
			]
			vi.mocked(db.records.toArray).mockResolvedValue(
				localRecords as any,
			)

			const options = recordsInfiniteQueryOptions()
			const result = await options.queryFn!({
				pageParam: 1,
			} as any)

			// Дубликат исключён — только серверная запись
			expect(result.data).toHaveLength(1)
			expect(result.localCount).toBe(0)
		})

		// =====================================================================
		// queryFn — не первая страница
		// =====================================================================

		it("queryFn на второй странице НЕ мержит локальные записи", async () => {
			const serverData = {
				data: [
					{
						id: "server-2",
						title: "Page 2 Record",
						status: "COMPLETED",
						documentCount: 1,
						documents: [],
						tags: [],
						createdAt: "2026-01-01T00:00:00Z",
						updatedAt: "2026-01-01T00:00:00Z",
					},
				],
				page: 2,
				limit: 10,
				total: 11,
			}
			vi.mocked(getRecords).mockResolvedValue(serverData as any)

			const options = recordsInfiniteQueryOptions()
			const result = await options.queryFn!({
				pageParam: 2,
			} as any)

			expect(db.records.toArray).not.toHaveBeenCalled()
			expect(result.localCount).toBe(0)
			expect(result.data).toHaveLength(1)
		})

		// =====================================================================
		// queryFn — с активными фильтрами (пропускает локальные)
		// =====================================================================

		it("queryFn пропускает локальные записи при активных фильтрах", async () => {
			const serverData = {
				data: [
					{
						id: "server-1",
						title: "Filtered Record",
						status: "COMPLETED",
						documentCount: 1,
						documents: [],
						tags: ["important"],
						createdAt: "2026-01-01T00:00:00Z",
						updatedAt: "2026-01-01T00:00:00Z",
					},
				],
				page: 1,
				limit: 10,
				total: 1,
			}
			vi.mocked(getRecords).mockResolvedValue(serverData as any)

			const filters: RecordsFilters = { search: "filtered" }
			const options = recordsInfiniteQueryOptions(filters)
			const result = await options.queryFn!({
				pageParam: 1,
			} as any)

			// При активных фильтрах локальные записи не добавляются
			expect(db.records.toArray).not.toHaveBeenCalled()
			expect(result.localCount).toBe(0)
			expect(result.data).toHaveLength(1)
		})

		// =====================================================================
		// getNextPageParam
		// =====================================================================

		it("getNextPageParam возвращает следующую страницу, если есть ещё данные", () => {
			const options = recordsInfiniteQueryOptions()
			const nextPage = options.getNextPageParam(
				{ data: [], page: 1, limit: 10, total: 25, localCount: 0 },
				[],
				1,
				[1],
			)
			expect(nextPage).toBe(2)
		})

		it("getNextPageParam возвращает undefined на последней странице", () => {
			const options = recordsInfiniteQueryOptions()
			const nextPage = options.getNextPageParam(
				{ data: [], page: 3, limit: 10, total: 25, localCount: 0 },
				[],
				3,
				[1, 2, 3],
			)
			expect(nextPage).toBeUndefined()
		})

		it("getNextPageParam возвращает undefined при пустом результате", () => {
			const options = recordsInfiniteQueryOptions()
			const nextPage = options.getNextPageParam(
				{ data: [], page: 1, limit: 10, total: 5, localCount: 0 },
				[],
				1,
				[1],
			)
			expect(nextPage).toBeUndefined()
		})
	})
})
