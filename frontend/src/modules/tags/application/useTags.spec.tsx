import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { useTags } from "./useTags"

vi.mock("../infrastructure/tagsApi", () => ({
	getTags: vi.fn(),
}))

import { getTags } from "../infrastructure/tagsApi"

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

describe("useTags", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("загружает список тегов", async () => {
		const tags = [
			{ id: "1", name: "Анализы", color: "#ff0000" },
			{ id: "2", name: "Рентген", color: "#00ff00" },
		]
		vi.mocked(getTags).mockResolvedValue(tags as any)

		const { result } = renderHook(() => useTags(), {
			wrapper: createWrapper(),
		})

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toEqual(tags)
		expect(getTags).toHaveBeenCalledTimes(1)
	})

	it("обрабатывает ошибку", async () => {
		vi.mocked(getTags).mockRejectedValue(new Error("Failed to fetch"))

		const { result } = renderHook(() => useTags(), {
			wrapper: createWrapper(),
		})

		await waitFor(() => expect(result.current.isError).toBe(true))
		expect(result.current.error?.message).toBe("Failed to fetch")
	})
})
