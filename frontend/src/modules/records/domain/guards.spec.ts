import { describe, it, expect } from "vitest"
import {
	isLocalRecord,
	hasActiveFilters,
	countActiveFilters,
} from "./guards"
import { DEFAULT_FILTERS, type LocalRecord, type UnifiedRecord } from "./types"
import { DocumentStatus } from "@shared-types"

function createLocalRecordFixture(): LocalRecord {
	return {
		id: "local-1",
		isLocal: true,
		title: "Локальная запись",
		description: "Описание",
		summary: "Сводка",
		documents: [
			{
				id: "doc-1",
				file: new File(["test"], "report.pdf", {
					type: "application/pdf",
				}),
				status: DocumentStatus.UPLOADING,
				uploadProgress: 33,
			},
		],
		tags: [
			{
				id: "tag-1",
				name: "Терапия",
				description: null,
				color: null,
				isSystem: false,
				createdAt: "2026-03-20T10:00:00.000Z",
				updatedAt: "2026-03-20T10:00:00.000Z",
			},
		],
		createdAt: 1711000000000,
		updatedAt: 1711001000000,
		date: new Date("2026-03-20T00:00:00.000Z"),
		documentCount: 1,
		status: DocumentStatus.UPLOADING,
		syncStatus: "pending",
		retryCount: 0,
	}
}

describe("records/domain/guards", () => {
	describe("isLocalRecord", () => {
		it("should return true for local record", () => {
			// Arrange
			const localRecord = createLocalRecordFixture()

			// Act
			const result = isLocalRecord(localRecord)

			// Assert
			expect(result).toBe(true)
		})

		it("should return false for server record", () => {
			// Arrange
			const serverRecord = {
				id: "server-1",
				title: "Серверная запись",
				createdAt: "2026-03-20T12:00:00.000Z",
				updatedAt: "2026-03-20T12:00:00.000Z",
				status: DocumentStatus.COMPLETED,
				documentCount: 0,
				documents: [],
				tags: [],
			} as unknown as UnifiedRecord

			// Act
			const result = isLocalRecord(serverRecord)

			// Assert
			expect(result).toBe(false)
		})
	})

	describe("hasActiveFilters", () => {
		it("should return false for default filters", () => {
			// Act
			const result = hasActiveFilters(DEFAULT_FILTERS)

			// Assert
			expect(result).toBe(false)
		})

		it("should return true when search filter is set", () => {
			// Arrange
			const filters = {
				...DEFAULT_FILTERS,
				search: "анализ",
			}

			// Act
			const result = hasActiveFilters(filters)

			// Assert
			expect(result).toBe(true)
		})

		it("should return true when date range is partially set", () => {
			// Arrange
			const filters = {
				...DEFAULT_FILTERS,
				dateFrom: "2026-03-01",
			}

			// Act
			const result = hasActiveFilters(filters)

			// Assert
			expect(result).toBe(true)
		})

		it("should return true when tags or status are non-empty", () => {
			// Arrange
			const byTags = {
				...DEFAULT_FILTERS,
				tags: ["tag-1"],
			}
			const byStatus = {
				...DEFAULT_FILTERS,
				status: [DocumentStatus.FAILED],
			}

			// Act
			const byTagsResult = hasActiveFilters(byTags)
			const byStatusResult = hasActiveFilters(byStatus)

			// Assert
			expect(byTagsResult).toBe(true)
			expect(byStatusResult).toBe(true)
		})

		it("should treat empty strings and arrays as inactive", () => {
			// Arrange
			const filters = {
				...DEFAULT_FILTERS,
				search: "",
				tags: [],
				status: [],
			}

			// Act
			const result = hasActiveFilters(filters)

			// Assert
			expect(result).toBe(false)
		})
	})

	describe("countActiveFilters", () => {
		it("should return 0 for default filters", () => {
			// Act
			const result = countActiveFilters(DEFAULT_FILTERS)

			// Assert
			expect(result).toBe(0)
		})

		it("should count date range as one filter", () => {
			// Arrange
			const filters = {
				...DEFAULT_FILTERS,
				dateFrom: "2026-03-01",
				dateTo: "2026-03-20",
			}

			// Act
			const result = countActiveFilters(filters)

			// Assert
			expect(result).toBe(1)
		})

		it("should count all active filter groups", () => {
			// Arrange
			const filters = {
				...DEFAULT_FILTERS,
				search: "cardio",
				dateFrom: "2026-03-01",
				tags: ["tag-1", "tag-2"],
				status: [DocumentStatus.COMPLETED],
			}

			// Act
			const result = countActiveFilters(filters)

			// Assert
			expect(result).toBe(4)
		})

		it("should ignore empty values while counting", () => {
			// Arrange
			const filters = {
				...DEFAULT_FILTERS,
				search: "",
				tags: [],
				status: [],
			}

			// Act
			const result = countActiveFilters(filters)

			// Assert
			expect(result).toBe(0)
		})
	})
})
