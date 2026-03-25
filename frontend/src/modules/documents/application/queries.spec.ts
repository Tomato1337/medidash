import { describe, it, expect, vi } from "vitest"
import { documentDownloadMutationOptions } from "./queries"
import { mutationKeys } from "@/shared/api/queries"

vi.mock("../infrastructure/documentsApi", () => ({
	getDocumentDownloadUrl: vi.fn(),
}))

describe("documents query options", () => {
	describe("documentDownloadMutationOptions", () => {
		it("возвращает правильный mutationKey", () => {
			const options = documentDownloadMutationOptions()
			expect(options.mutationKey).toEqual(mutationKeys.documents.download)
		})

		it("имеет mutationFn", () => {
			const options = documentDownloadMutationOptions()
			expect(options.mutationFn).toBeDefined()
			expect(typeof options.mutationFn).toBe("function")
		})
	})
})
