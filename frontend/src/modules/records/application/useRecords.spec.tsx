import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import {
	useRecords,
	useRecord,
	useCreateRecord,
	useRetryRecord,
	useDeleteLocalRecord,
} from "./useRecords"
import type { RecordsPageData } from "./queries"

// Мокаем зависимости
vi.mock("../infrastructure/recordsApi", () => ({
	getRecord: vi.fn(),
	getRecords: vi.fn(),
}))

vi.mock("@/shared/lib/indexedDB", () => ({
	db: {
		records: {
			toArray: vi.fn().mockResolvedValue([]),
			add: vi.fn(),
			delete: vi.fn(),
		},
	},
}))

vi.mock("../infrastructure/sync", () => ({
	createRecordMutation: vi.fn(() => ({
		mutationFn: vi.fn().mockResolvedValue({ id: "new-rec" }),
		onSuccess: vi.fn(),
	})),
	retryRecordMutation: vi.fn(() => ({
		mutationFn: vi.fn().mockResolvedValue(undefined),
		onSuccess: vi.fn(),
	})),
	deleteLocalRecordMutation: vi.fn(() => ({
		mutationFn: vi.fn().mockResolvedValue(undefined),
		onSuccess: vi.fn(),
	})),
}))

vi.mock("@/modules/offline", () => ({
	syncManager: {
		startSync: vi.fn(),
		compress: vi.fn(),
		upload: vi.fn(),
		retryServerProcessing: vi.fn(),
	},
}))

import { getRecord, getRecords } from "../infrastructure/recordsApi"

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	})
	return ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>
			{children}
		</QueryClientProvider>
	)
}

describe("useRecords hooks", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	// =========================================================================
	// useRecords — группировка по датам
	// =========================================================================

	describe("useRecords", () => {
		it("возвращает начальное состояние загрузки", () => {
			vi.mocked(getRecords).mockReturnValue(new Promise(() => {}))

			const { result } = renderHook(() => useRecords(), {
				wrapper: createWrapper(),
			})

			expect(result.current.isLoading).toBe(true)
			expect(result.current.groupedRecords).toEqual({})
		})

		it("группирует записи по дате", async () => {
			const pageData: RecordsPageData = {
				data: [
					{
						id: "rec-1",
						title: "Record 1",
						date: "2026-01-15",
						createdAt: "2026-01-15T10:00:00Z",
						updatedAt: "2026-01-15T10:00:00Z",
						status: "COMPLETED",
						documentCount: 1,
						documents: [],
						tags: [],
						isLocal: false,
					},
					{
						id: "rec-2",
						title: "Record 2",
						date: "2026-01-15",
						createdAt: "2026-01-15T12:00:00Z",
						updatedAt: "2026-01-15T12:00:00Z",
						status: "COMPLETED",
						documentCount: 1,
						documents: [],
						tags: [],
						isLocal: false,
					},
					{
						id: "rec-3",
						title: "Record 3",
						date: "2026-02-20",
						createdAt: "2026-02-20T08:00:00Z",
						updatedAt: "2026-02-20T08:00:00Z",
						status: "COMPLETED",
						documentCount: 1,
						documents: [],
						tags: [],
						isLocal: false,
					},
				],
				page: 1,
				limit: 10,
				total: 3,
				localCount: 0,
			}
			vi.mocked(getRecords).mockResolvedValue({
				data: pageData.data.map((r) => ({
					...r,
					documents: [],
					tags: [],
				})),
				page: 1,
				limit: 10,
				total: 3,
			} as any)

			const { result } = renderHook(() => useRecords(), {
				wrapper: createWrapper(),
			})

			await waitFor(() => expect(result.current.isLoading).toBe(false))

			const keys = Object.keys(result.current.groupedRecords)
			// Записи группируются по дате, сортируются newest first (desc)
			expect(keys).toContain("2026-01-15")
			expect(keys).toContain("2026-02-20")
		})

		it("помещает записи без даты в группу 'Без даты'", async () => {
			vi.mocked(getRecords).mockResolvedValue({
				data: [
					{
						id: "rec-1",
						title: "No Date Record",
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
			} as any)

			const { result } = renderHook(() => useRecords(), {
				wrapper: createWrapper(),
			})

			await waitFor(() => expect(result.current.isLoading).toBe(false))

			const keys = Object.keys(result.current.groupedRecords)
			expect(keys).toContain("Без даты")
		})

		it("использует dataSource при передаче", async () => {
			const mockQueryFn = vi.fn().mockResolvedValue({
				data: [
					{
						id: "shared-rec-1",
						title: "Shared Record",
						status: "COMPLETED",
						documentCount: 0,
						documents: [],
						tags: [],
						isLocal: false,
						createdAt: "2026-01-01T00:00:00Z",
						updatedAt: "2026-01-01T00:00:00Z",
					},
				],
				page: 1,
				limit: 10,
				total: 1,
				localCount: 0,
			} as RecordsPageData)

			const dataSource = {
				queryKey: ["custom", "records"],
				queryFn: mockQueryFn,
			}

			const { result } = renderHook(
				() => useRecords(dataSource),
				{
					wrapper: createWrapper(),
				},
			)

			await waitFor(() => expect(result.current.isLoading).toBe(false))
			expect(mockQueryFn).toHaveBeenCalled()
		})
	})

	// =========================================================================
	// useRecord
	// =========================================================================

	describe("useRecord", () => {
		it("загружает одну запись по id", async () => {
			const record = {
				id: "rec-1",
				title: "Test Record",
				status: "COMPLETED",
				documentCount: 1,
				documents: [],
				tags: [],
				createdAt: "2026-01-01T00:00:00Z",
				updatedAt: "2026-01-01T00:00:00Z",
			}
			vi.mocked(getRecord).mockResolvedValue(record as any)

			const { result } = renderHook(() => useRecord("rec-1"), {
				wrapper: createWrapper(),
			})

			await waitFor(() => expect(result.current.isSuccess).toBe(true))
			expect(getRecord).toHaveBeenCalledWith("rec-1")
		})

		it("использует dataSource при передаче", async () => {
			const mockQueryFn = vi.fn().mockResolvedValue({
				id: "shared-rec",
				title: "Shared",
			})

			const dataSource = {
				queryKey: ["custom", "record", "shared-rec"],
				queryFn: mockQueryFn,
			}

			const { result } = renderHook(
				() => useRecord("shared-rec", dataSource),
				{
					wrapper: createWrapper(),
				},
			)

			await waitFor(() => expect(result.current.isSuccess).toBe(true))
			expect(mockQueryFn).toHaveBeenCalled()
			expect(getRecord).not.toHaveBeenCalled()
		})
	})

	// =========================================================================
	// useCreateRecord
	// =========================================================================

	describe("useCreateRecord", () => {
		it("возвращает мутацию для создания записи", () => {
			const { result } = renderHook(() => useCreateRecord(), {
				wrapper: createWrapper(),
			})

			expect(result.current.mutate).toBeDefined()
			expect(result.current.mutateAsync).toBeDefined()
			expect(result.current.isPending).toBe(false)
		})
	})

	// =========================================================================
	// useRetryRecord
	// =========================================================================

	describe("useRetryRecord", () => {
		it("возвращает мутацию для повтора обработки", () => {
			const { result } = renderHook(() => useRetryRecord(), {
				wrapper: createWrapper(),
			})

			expect(result.current.mutate).toBeDefined()
			expect(result.current.isPending).toBe(false)
		})
	})

	// =========================================================================
	// useDeleteLocalRecord
	// =========================================================================

	describe("useDeleteLocalRecord", () => {
		it("возвращает мутацию для удаления локальной записи", () => {
			const { result } = renderHook(() => useDeleteLocalRecord(), {
				wrapper: createWrapper(),
			})

			expect(result.current.mutate).toBeDefined()
			expect(result.current.isPending).toBe(false)
		})
	})
})
