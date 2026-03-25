import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { useDocumentDownload } from "./useDocumentDownload"

vi.mock("../infrastructure/documentsApi", () => ({
	getDocumentDownloadUrl: vi.fn(),
}))

import { getDocumentDownloadUrl } from "../infrastructure/documentsApi"

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

describe("useDocumentDownload", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.stubGlobal("open", vi.fn())
	})

	it("возвращает download функцию и начальное состояние", () => {
		const { result } = renderHook(() => useDocumentDownload(), {
			wrapper: createWrapper(),
		})

		expect(result.current.download).toBeDefined()
		expect(typeof result.current.download).toBe("function")
		expect(result.current.isLoading).toBe(false)
		expect(result.current.error).toBeNull()
	})

	it("открывает URL в новой вкладке при успешном скачивании", async () => {
		vi.mocked(getDocumentDownloadUrl).mockResolvedValue({
			downloadUrl: "https://example.com/download/doc-1",
		} as any)

		const { result } = renderHook(() => useDocumentDownload(), {
			wrapper: createWrapper(),
		})

		await result.current.download("doc-1")

		expect(getDocumentDownloadUrl).toHaveBeenCalledWith("doc-1")
		expect(window.open).toHaveBeenCalledWith(
			"https://example.com/download/doc-1",
			"_blank",
		)
	})

	it("не открывает вкладку если downloadUrl отсутствует", async () => {
		vi.mocked(getDocumentDownloadUrl).mockResolvedValue({} as any)

		const { result } = renderHook(() => useDocumentDownload(), {
			wrapper: createWrapper(),
		})

		await result.current.download("doc-1")

		expect(window.open).not.toHaveBeenCalled()
	})
})
