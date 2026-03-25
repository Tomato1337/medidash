import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import {
	useSharedAccessList,
	useSharedAccessInfo,
	useSharedCheckAuth,
	useSharedAccessSessions,
	useCreateSharedAccess,
	useRevokeSharedAccess,
	useRevokeSharedAccessSession,
} from "./useSharedAccess"

vi.mock("../infrastructure/sharedAccessApi", () => ({
	listSharedAccesses: vi.fn(),
	getSharedAccessInfo: vi.fn(),
	listSharedAccessSessions: vi.fn(),
	createSharedAccess: vi.fn(),
	revokeSharedAccess: vi.fn(),
	revokeSharedAccessSession: vi.fn(),
}))

vi.mock("../infrastructure/sharedRecordsApi", () => ({
	getSharedRecords: vi.fn(),
}))

import {
	listSharedAccesses,
	getSharedAccessInfo,
	listSharedAccessSessions,
	createSharedAccess,
	revokeSharedAccess,
	revokeSharedAccessSession,
} from "../infrastructure/sharedAccessApi"
import { getSharedRecords } from "../infrastructure/sharedRecordsApi"

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

describe("useSharedAccess hooks", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	// =========================================================================
	// useSharedAccessList
	// =========================================================================

	describe("useSharedAccessList", () => {
		it("загружает список shared access", async () => {
			const accesses = [
				{ id: "sa-1", token: "token-1", recordId: "rec-1" },
			]
			vi.mocked(listSharedAccesses).mockResolvedValue(accesses as any)

			const { result } = renderHook(() => useSharedAccessList(), {
				wrapper: createWrapper(),
			})

			await waitFor(() => expect(result.current.isSuccess).toBe(true))
			expect(result.current.data).toEqual(accesses)
		})
	})

	// =========================================================================
	// useSharedAccessInfo
	// =========================================================================

	describe("useSharedAccessInfo", () => {
		it("загружает информацию по токену", async () => {
			const info = { id: "sa-1", expiresAt: "2026-12-31" }
			vi.mocked(getSharedAccessInfo).mockResolvedValue(info as any)

			const { result } = renderHook(
				() => useSharedAccessInfo("token-123"),
				{
					wrapper: createWrapper(),
				},
			)

			await waitFor(() => expect(result.current.isSuccess).toBe(true))
			expect(getSharedAccessInfo).toHaveBeenCalledWith("token-123")
		})

		it("не выполняет запрос при пустом токене", () => {
			const { result } = renderHook(() => useSharedAccessInfo(""), {
				wrapper: createWrapper(),
			})

			expect(result.current.fetchStatus).toBe("idle")
		})
	})

	// =========================================================================
	// useSharedCheckAuth
	// =========================================================================

	describe("useSharedCheckAuth", () => {
		it("проверяет авторизацию и возвращает boolean", async () => {
			vi.mocked(getSharedRecords).mockResolvedValue({
				data: [],
				page: 1,
				limit: 10,
				total: 0,
			} as any)

			const { result } = renderHook(
				() => useSharedCheckAuth("token-123"),
				{
					wrapper: createWrapper(),
				},
			)

			await waitFor(() => expect(result.current.isSuccess).toBe(true))
			// select: (data) => !!data — данные есть, значит true
			expect(result.current.data).toBe(true)
		})

		it("не выполняет запрос при пустом токене", () => {
			const { result } = renderHook(() => useSharedCheckAuth(""), {
				wrapper: createWrapper(),
			})

			expect(result.current.fetchStatus).toBe("idle")
		})
	})

	// =========================================================================
	// useSharedAccessSessions
	// =========================================================================

	describe("useSharedAccessSessions", () => {
		it("загружает сессии по accessId", async () => {
			const sessions = [
				{ id: "session-1", createdAt: "2026-01-01T00:00:00Z" },
			]
			vi.mocked(listSharedAccessSessions).mockResolvedValue(
				sessions as any,
			)

			const { result } = renderHook(
				() => useSharedAccessSessions("access-1"),
				{
					wrapper: createWrapper(),
				},
			)

			await waitFor(() => expect(result.current.isSuccess).toBe(true))
			expect(listSharedAccessSessions).toHaveBeenCalledWith("access-1")
		})

		it("не выполняет запрос при пустом accessId", () => {
			const { result } = renderHook(
				() => useSharedAccessSessions(""),
				{
					wrapper: createWrapper(),
				},
			)

			expect(result.current.fetchStatus).toBe("idle")
		})
	})

	// =========================================================================
	// useCreateSharedAccess
	// =========================================================================

	describe("useCreateSharedAccess", () => {
		it("создаёт shared access", async () => {
			const newAccess = { id: "sa-new", token: "new-token" }
			vi.mocked(createSharedAccess).mockResolvedValue(newAccess as any)

			const { result } = renderHook(() => useCreateSharedAccess(), {
				wrapper: createWrapper(),
			})

			result.current.mutate({ recordId: "rec-1" } as any)

			await waitFor(() => expect(result.current.isSuccess).toBe(true))
			expect(createSharedAccess).toHaveBeenCalledWith(
				{ recordId: "rec-1" },
				expect.anything(),
			)
		})
	})

	// =========================================================================
	// useRevokeSharedAccess
	// =========================================================================

	describe("useRevokeSharedAccess", () => {
		it("отзывает shared access", async () => {
			vi.mocked(revokeSharedAccess).mockResolvedValue(undefined as any)

			const { result } = renderHook(() => useRevokeSharedAccess(), {
				wrapper: createWrapper(),
			})

			result.current.mutate("sa-1" as any)

			await waitFor(() => expect(result.current.isSuccess).toBe(true))
			expect(revokeSharedAccess).toHaveBeenCalledWith(
				"sa-1",
				expect.anything(),
			)
		})
	})

	// =========================================================================
	// useRevokeSharedAccessSession
	// =========================================================================

	describe("useRevokeSharedAccessSession", () => {
		it("отзывает конкретную сессию", async () => {
			vi.mocked(revokeSharedAccessSession).mockResolvedValue(
				undefined as any,
			)

			const { result } = renderHook(
				() => useRevokeSharedAccessSession(),
				{
					wrapper: createWrapper(),
				},
			)

			result.current.mutate({
				accessId: "access-1",
				sessionId: "session-1",
			})

			await waitFor(() => expect(result.current.isSuccess).toBe(true))
			expect(revokeSharedAccessSession).toHaveBeenCalledWith(
				"access-1",
				"session-1",
			)
		})
	})
})
