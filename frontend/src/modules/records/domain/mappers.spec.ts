import { describe, it, expect } from "vitest"
import { toDisplayRecord } from "./mappers"
import type { LocalRecord, UnifiedRecord } from "./types"
import { DocumentStatus, FailedPhase } from "@shared-types"

function createLocalRecordFixture(): LocalRecord {
	return {
		id: "local-rec-1",
		isLocal: true,
		title: "Локальная карта",
		description: "Описание локальной записи",
		summary: "Итог",
		documents: [
			{
				id: "local-doc-1",
				file: new File(["pdf"], "lab-result.pdf", { type: "application/pdf" }),
				status: DocumentStatus.UPLOADING,
				uploadProgress: 55,
				errorMessage: "Временная ошибка",
			},
		],
		tags: [
			{
				id: "tag-1",
				name: "Лаборатория",
				description: null,
				color: null,
				isSystem: false,
				createdAt: "2026-03-20T10:00:00.000Z",
				updatedAt: "2026-03-20T10:00:00.000Z",
			},
		],
		createdAt: 1711000000000,
		updatedAt: 1711003600000,
		date: new Date("2026-03-20T00:00:00.000Z"),
		documentCount: 1,
		status: DocumentStatus.UPLOADING,
		syncStatus: "uploading",
		errorPhase: FailedPhase.UPLOADING,
		retryCount: 1,
	}
}

function createServerRecordFixture(
	overrides: Partial<UnifiedRecord> = {},
): UnifiedRecord {
	return {
		id: "server-rec-1",
		userId: "user-1",
		title: "Серверная карта",
		description: "Описание с сервера",
		summary: "Краткое резюме",
		date: "2026-03-21T00:00:00.000Z",
		createdAt: "2026-03-21T10:00:00.000Z",
		updatedAt: "2026-03-21T11:00:00.000Z",
		status: DocumentStatus.COMPLETED,
		documentCount: 1,
		documents: [
			{
				id: "server-doc-1",
				recordId: "server-rec-1",
				fileName: "server-file.pdf",
				originalFileName: "source-file.pdf",
				mimeType: "application/pdf",
				fileSize: 2048,
				status: DocumentStatus.COMPLETED,
				errorMessage: null,
				createdAt: "2026-03-21T10:00:00.000Z",
				updatedAt: "2026-03-21T11:00:00.000Z",
			},
		],
		tags: ["Кардиология"],
		failedPhase: FailedPhase.PROCESSING,
		...overrides,
	} as unknown as UnifiedRecord
}

describe("records/domain/mappers", () => {
	describe("toDisplayRecord", () => {
		it("should map local record to display format", () => {
			// Arrange
			const input = createLocalRecordFixture()

			// Act
			const result = toDisplayRecord(input)

			// Assert
			expect(result).toEqual({
				id: "local-rec-1",
				title: "Локальная карта",
				description: "Описание локальной записи",
				summary: "Итог",
				date: new Date("2026-03-20T00:00:00.000Z"),
				createdAt: new Date(1711000000000).toISOString(),
				updatedAt: new Date(1711003600000).toISOString(),
				status: DocumentStatus.UPLOADING,
				documentCount: 1,
				documents: [
					{
						id: "local-doc-1",
						fileName: "lab-result.pdf",
						originalFileName: "lab-result.pdf",
						mimeType: "application/pdf",
						fileSize: 3,
						status: DocumentStatus.UPLOADING,
						uploadProgress: 55,
						errorMessage: "Временная ошибка",
						createdAt: new Date(1711000000000).toISOString(),
						updatedAt: new Date(1711003600000).toISOString(),
					},
				],
				tags: ["Лаборатория"],
				isLocal: true,
				errorPhase: FailedPhase.UPLOADING,
				syncStatus: "uploading",
			})
		})

		it("should map server record to display format", () => {
			// Arrange
			const input = createServerRecordFixture()

			// Act
			const result = toDisplayRecord(input)

			// Assert
			expect(result).toEqual({
				id: "server-rec-1",
				title: "Серверная карта",
				description: "Описание с сервера",
				summary: "Краткое резюме",
				date: "2026-03-21T00:00:00.000Z",
				createdAt: "2026-03-21T10:00:00.000Z",
				updatedAt: "2026-03-21T11:00:00.000Z",
				status: DocumentStatus.COMPLETED,
				documentCount: 1,
				documents: [
					{
						id: "server-doc-1",
						fileName: "server-file.pdf",
						originalFileName: "source-file.pdf",
						mimeType: "application/pdf",
						fileSize: 2048,
						status: DocumentStatus.COMPLETED,
						errorMessage: null,
						createdAt: "2026-03-21T10:00:00.000Z",
						updatedAt: "2026-03-21T11:00:00.000Z",
					},
				],
				tags: ["Кардиология"],
				isLocal: false,
				errorPhase: FailedPhase.PROCESSING,
			})
		})

		it("should preserve null and empty values from server record", () => {
			// Arrange
			const input = createServerRecordFixture({
				description: null,
				summary: null,
				date: null,
				documents: [],
				tags: [],
				failedPhase: undefined,
			})

			// Act
			const result = toDisplayRecord(input)

			// Assert
			expect(result.description).toBeNull()
			expect(result.summary).toBeNull()
			expect(result.date).toBeNull()
			expect(result.documents).toEqual([])
			expect(result.tags).toEqual([])
			expect(result.errorPhase).toBeUndefined()
		})
	})
})
