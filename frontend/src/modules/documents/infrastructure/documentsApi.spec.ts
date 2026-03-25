import { describe, it, expect, vi, beforeEach } from "vitest"
import { getDocumentDownloadUrl } from "./documentsApi"

vi.mock("@/shared/api/api", () => ({
	client: {
		GET: vi.fn(),
	},
}))

import { client } from "@/shared/api/api"

describe("documentsApi", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe("getDocumentDownloadUrl", () => {
		it("возвращает URL для скачивания документа", async () => {
			const mockData = { downloadUrl: "https://minio.local/doc.pdf" }
			vi.mocked(client.GET).mockResolvedValue({
				data: mockData,
				error: undefined,
			} as any)

			const result = await getDocumentDownloadUrl("d1")

			expect(client.GET).toHaveBeenCalledWith(
				"/api/documents/{id}/download-url",
				{
					params: { path: { id: "d1" } },
				},
			)
			expect(result).toEqual(mockData)
		})

		it("выбрасывает ошибку при наличии error", async () => {
			vi.mocked(client.GET).mockResolvedValue({
				data: undefined,
				error: { message: "Not found" },
			} as any)

			await expect(getDocumentDownloadUrl("bad")).rejects.toEqual({
				message: "Not found",
			})
		})
	})
})
