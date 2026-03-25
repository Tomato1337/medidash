import { describe, it, expect } from "vitest"
import {
	recordsFiltersSchema,
	localRecordSchema,
	idbDocumentSchema,
	idbTagSchema,
} from "./schemas"
import { DocumentStatus, FailedPhase } from "@shared-types"

describe("records/domain/schemas", () => {
	describe("recordsFiltersSchema", () => {
		it("should validate complete filter object", () => {
			// Arrange
			const input = {
				search: "анализ крови",
				sortBy: "title",
				sortDir: "asc",
				dateFrom: "2026-03-01",
				dateTo: "2026-03-20",
				tags: ["tag-1", "tag-2"],
				status: [DocumentStatus.COMPLETED, DocumentStatus.FAILED],
			}

			// Act
			const result = recordsFiltersSchema.safeParse(input)

			// Assert
			expect(result.success).toBe(true)
			expect(result.data).toEqual(input)
		})

		it("should parse comma separated tags and status strings", () => {
			// Arrange
			const input = {
				sortBy: "date",
				sortDir: "desc",
				tags: "tag-1,tag-2,,",
				status: "COMPLETED,FAILED",
			}

			// Act
			const result = recordsFiltersSchema.safeParse(input)

			// Assert
			expect(result.success).toBe(true)
			expect(result.data.tags).toEqual(["tag-1", "tag-2"])
			expect(result.data.status).toEqual(["COMPLETED", "FAILED"])
		})

		it("should apply default sort values for invalid sort fields", () => {
			// Arrange
			const input = {
				sortBy: "invalid",
				sortDir: "invalid",
			}

			// Act
			const result = recordsFiltersSchema.safeParse(input)

			// Assert
			expect(result.success).toBe(true)
			expect(result.data.sortBy).toBe("date")
			expect(result.data.sortDir).toBe("desc")
		})

		it("should remove invalid search value via catch", () => {
			// Arrange
			const input = {
				search: "a".repeat(201),
				sortBy: "date",
				sortDir: "desc",
			}

			// Act
			const result = recordsFiltersSchema.safeParse(input)

			// Assert
			expect(result.success).toBe(true)
			expect(result.data.search).toBeUndefined()
		})

		it("should reject wrong tags type", () => {
			// Arrange
			const input = {
				sortBy: "date",
				sortDir: "desc",
				tags: 123,
			}

			// Act
			const result = recordsFiltersSchema.safeParse(input)

			// Assert
			expect(result.success).toBe(true)
			expect(result.data.tags).toBeUndefined()
		})

		it("should reject wrong status type", () => {
			// Arrange
			const input = {
				sortBy: "date",
				sortDir: "desc",
				status: { bad: true },
			}

			// Act
			const result = recordsFiltersSchema.safeParse(input)

			// Assert
			expect(result.success).toBe(true)
			expect(result.data.status).toBeUndefined()
		})
	})

	describe("idbDocumentSchema", () => {
		it("should validate document with File and optional fields", () => {
			// Arrange
			const input = {
				id: "doc-1",
				file: new File(["binary"], "scan.png", { type: "image/png" }),
				status: DocumentStatus.UPLOADING,
				uploadProgress: 10,
				errorMessage: "Ошибка",
				errorPhase: FailedPhase.UPLOADING,
			}

			// Act
			const result = idbDocumentSchema.safeParse(input)

			// Assert
			expect(result.success).toBe(true)
		})

		it("should reject invalid status", () => {
			// Arrange
			const input = {
				id: "doc-1",
				file: new File(["binary"], "scan.png", { type: "image/png" }),
				status: "UNKNOWN",
			}

			// Act
			const result = idbDocumentSchema.safeParse(input)

			// Assert
			expect(result.success).toBe(false)
		})
	})

	describe("idbTagSchema", () => {
		it("should validate tag with nullable fields", () => {
			// Arrange
			const input = {
				id: "tag-1",
				name: "Диагностика",
				description: null,
				color: null,
				isSystem: false,
				createdAt: "2026-03-20T10:00:00.000Z",
				updatedAt: "2026-03-20T10:00:00.000Z",
			}

			// Act
			const result = idbTagSchema.safeParse(input)

			// Assert
			expect(result.success).toBe(true)
		})
	})

	describe("localRecordSchema", () => {
		it("should validate complete local record and transform date string", () => {
			// Arrange
			const input = {
				id: "local-1",
				isLocal: true,
				title: "Локальная запись",
				description: "Описание",
				summary: "Суммаризация",
				documents: [
					{
						id: "doc-1",
						file: {
							name: "file.pdf",
							size: 1024,
							type: "application/pdf",
						},
						compressed: {
							size: 512,
							type: "application/pdf",
						},
						status: DocumentStatus.PENDING,
					},
				],
				tags: [
					{
						id: "tag-1",
						name: "Архив",
						isSystem: false,
						createdAt: "2026-03-20T10:00:00.000Z",
						updatedAt: "2026-03-20T10:00:00.000Z",
					},
				],
				createdAt: 1711000000000,
				updatedAt: 1711003600000,
				date: "2026-03-20T00:00:00.000Z",
				documentCount: 1,
				status: DocumentStatus.PENDING,
				syncStatus: "pending",
				retryCount: 0,
			}

			// Act
			const result = localRecordSchema.safeParse(input)

			// Assert
			expect(result.success).toBe(true)
			expect(result.data.date).toBeInstanceOf(Date)
		})

		it("should reject record without required title", () => {
			// Arrange
			const input = {
				id: "local-1",
				isLocal: true,
				documents: [],
				tags: [],
				createdAt: 1711000000000,
				updatedAt: 1711003600000,
				documentCount: 0,
				status: DocumentStatus.PENDING,
				syncStatus: "pending",
				retryCount: 0,
			}

			// Act
			const result = localRecordSchema.safeParse(input)

			// Assert
			expect(result.success).toBe(false)
		})

		it("should reject invalid sync status", () => {
			// Arrange
			const input = {
				id: "local-1",
				isLocal: true,
				title: "Локальная запись",
				documents: [],
				tags: [],
				createdAt: 1711000000000,
				updatedAt: 1711003600000,
				documentCount: 0,
				status: DocumentStatus.PENDING,
				syncStatus: "unknown",
				retryCount: 0,
			}

			// Act
			const result = localRecordSchema.safeParse(input)

			// Assert
			expect(result.success).toBe(false)
		})
	})
})
