import { Test, TestingModule } from "@nestjs/testing"
import {
	BadRequestException,
	NotFoundException,
} from "@nestjs/common"
import { describe, it, expect, beforeEach, vi } from "vitest"
import { Readable } from "stream"
import { FailedPhase, RedisChannels } from "@shared-types"
import { DocumentsService } from "./documents.service"
import { PrismaService } from "../prisma/prisma.service"
import { MinioService } from "../minio/minio.service"
import { RedisService } from "../redis/redis.service"
import { EnvService } from "../env/env.service"

const createDocumentFixture = (overrides: Record<string, unknown> = {}) => ({
	id: "doc-1",
	recordId: "record-1",
	userId: "user-1",
	title: "file.pdf",
	fileName: "generated.pdf",
	originalFileName: "file.pdf",
	mimeType: "application/pdf",
	fileSize: 1024,
	description: null,
	status: "UPLOADING",
	errorMessage: null,
	processedAt: null,
	failedPhase: null,
	minioUrl: "http://minio:9000/medical-documents/records/record-1/generated.pdf",
	minioBucket: "medical-documents",
	minioObjectKey: "records/record-1/generated.pdf",
	extractedText: null,
	metadata: null,
	deletedAt: null,
	createdAt: new Date("2024-01-15T10:00:00.000Z"),
	updatedAt: new Date("2024-01-15T10:00:00.000Z"),
	...overrides,
})

describe("DocumentsService", () => {
	let service: DocumentsService

	const prismaMock = {
		record: {
			findFirst: vi.fn(),
			update: vi.fn(),
		},
		document: {
			create: vi.fn(),
			findFirst: vi.fn(),
			findMany: vi.fn(),
			update: vi.fn(),
			updateMany: vi.fn(),
		},
		tag: {
			upsert: vi.fn(),
			findMany: vi.fn(),
		},
		recordTag: {
			createMany: vi.fn(),
		},
	}

	const minioMock = {
		uploadStream: vi.fn(),
		downloadFile: vi.fn(),
		getFileUrl: vi.fn(),
		deleteFile: vi.fn(),
		getPresignedUploadUrl: vi.fn(),
		fileExists: vi.fn(),
		getFileStats: vi.fn(),
	}

	const redisMock = {
		publish: vi.fn(),
		publishRecordReadyForParsing: vi.fn(),
	}

	const envMock = {
		get: vi.fn((key: string) => {
			if (key === "MINIO_ENDPOINT") {
				return "minio"
			}
			if (key === "MINIO_PORT") {
				return 9000
			}
			if (key === "MINIO_BUCKET_NAME") {
				return "medical-documents"
			}
			return undefined
		}),
	}

	beforeEach(async () => {
		vi.clearAllMocks()

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				DocumentsService,
				{
					provide: PrismaService,
					useValue: prismaMock,
				},
				{
					provide: MinioService,
					useValue: minioMock,
				},
				{
					provide: RedisService,
					useValue: redisMock,
				},
				{
					provide: EnvService,
					useValue: envMock,
				},
			],
		}).compile()

		service = module.get<DocumentsService>(DocumentsService)
	})

	describe("uploadDocumentStream", () => {
		it("should upload document, create DB record and return dto", async () => {
			// Arrange
			prismaMock.record.findFirst.mockResolvedValue({ id: "record-1" })
			minioMock.uploadStream.mockResolvedValue(undefined)
			prismaMock.document.create.mockResolvedValue(createDocumentFixture())

			const fileBuffer = Buffer.from("pdf content")
			const stream = Readable.from([fileBuffer])

			// Act
			const result = await service.uploadDocumentStream(
				"user-1",
				"record-1",
				{
					filename: "report.pdf",
					mimetype: "application/pdf",
					file: stream,
				},
				"Описание",
			)

			// Assert
			expect(prismaMock.record.findFirst).toHaveBeenCalledWith({
				where: {
					id: "record-1",
					userId: "user-1",
					deletedAt: null,
				},
			})
			expect(minioMock.uploadStream).toHaveBeenCalledTimes(1)
			expect(prismaMock.document.create).toHaveBeenCalledTimes(1)
			expect(result.id).toBe("doc-1")
		})

		it("should throw NotFoundException when record is not found", async () => {
			// Arrange
			prismaMock.record.findFirst.mockResolvedValue(null)

			// Act
			const call = service.uploadDocumentStream("user-1", "missing", {
				filename: "report.pdf",
				mimetype: "application/pdf",
				file: Readable.from([Buffer.from("a")]),
			})

			// Assert
			await expect(call).rejects.toThrow(NotFoundException)
		})

		it("should throw BadRequestException for unsupported mimetype", async () => {
			// Arrange
			prismaMock.record.findFirst.mockResolvedValue({ id: "record-1" })

			// Act
			const call = service.uploadDocumentStream("user-1", "record-1", {
				filename: "malware.exe",
				mimetype: "application/x-msdownload",
				file: Readable.from([Buffer.from("a")]),
			})

			// Assert
			await expect(call).rejects.toThrow(BadRequestException)
		})
	})

	describe("getRecordDocuments", () => {
		it("should return record documents when record belongs to user", async () => {
			// Arrange
			prismaMock.record.findFirst.mockResolvedValue({ id: "record-1" })
			prismaMock.document.findMany.mockResolvedValue([
				createDocumentFixture(),
				createDocumentFixture({ id: "doc-2" }),
			])

			// Act
			const result = await service.getRecordDocuments("record-1", "user-1")

			// Assert
			expect(prismaMock.document.findMany).toHaveBeenCalledWith({
				where: {
					recordId: "record-1",
					deletedAt: null,
				},
				orderBy: {
					createdAt: "desc",
				},
			})
			expect(result).toHaveLength(2)
		})
	})

	describe("getDownloadUrl", () => {
		it("should generate presigned download URL", async () => {
			// Arrange
			prismaMock.document.findFirst.mockResolvedValue(createDocumentFixture())
			minioMock.getFileUrl.mockResolvedValue("https://minio/download/url")

			// Act
			const result = await service.getDownloadUrl("doc-1", "user-1", 120)

			// Assert
			expect(minioMock.getFileUrl).toHaveBeenCalledWith(
				"records/record-1/generated.pdf",
				120,
			)
			expect(result.downloadUrl).toBe("https://minio/download/url")
			expect(result.expiresIn).toBe(120)
		})
	})

	describe("deleteDocument", () => {
		it("should delete document from MinIO and soft delete in DB", async () => {
			// Arrange
			prismaMock.document.findFirst.mockResolvedValue(createDocumentFixture())
			minioMock.deleteFile.mockResolvedValue(undefined)
			prismaMock.document.update.mockResolvedValue(createDocumentFixture())

			// Act
			await service.deleteDocument("doc-1", "user-1")

			// Assert
			expect(minioMock.deleteFile).toHaveBeenCalledWith(
				"records/record-1/generated.pdf",
			)
			expect(prismaMock.document.update).toHaveBeenCalledWith({
				where: { id: "doc-1" },
				data: {
					deletedAt: expect.any(Date),
				},
			})
		})

		it("should propagate MinIO delete error", async () => {
			// Arrange
			prismaMock.document.findFirst.mockResolvedValue(createDocumentFixture())
			minioMock.deleteFile.mockRejectedValue(new Error("minio unavailable"))

			// Act
			const call = service.deleteDocument("doc-1", "user-1")

			// Assert
			await expect(call).rejects.toThrow("minio unavailable")
		})
	})

	describe("getUploadUrl", () => {
		it("should create document and return upload URL", async () => {
			// Arrange
			prismaMock.record.findFirst.mockResolvedValue({ id: "record-1" })
			prismaMock.document.create.mockResolvedValue(createDocumentFixture())
			minioMock.getPresignedUploadUrl.mockResolvedValue(
				"https://minio/upload/url",
			)

			// Act
			const result = await service.getUploadUrl(
				"user-1",
				"record-1",
				"large.pdf",
				"application/pdf",
				5000,
			)

			// Assert
			expect(prismaMock.document.create).toHaveBeenCalledTimes(1)
			expect(minioMock.getPresignedUploadUrl).toHaveBeenCalledTimes(1)
			expect(result.uploadUrl).toBe("https://minio/upload/url")
			expect(result.documentId).toBe("doc-1")
		})
	})

	describe("confirmUpload", () => {
		it("should confirm upload and publish parsing event when all documents ready", async () => {
			// Arrange
			prismaMock.document.findFirst.mockResolvedValue(createDocumentFixture())
			minioMock.fileExists.mockResolvedValue(true)
			minioMock.getFileStats.mockResolvedValue({ size: 2048 })
			prismaMock.document.update.mockResolvedValue(
				createDocumentFixture({
					status: "PARSING",
					fileSize: 2048,
				}),
			)
			prismaMock.document.findMany.mockResolvedValue([
				{
					id: "doc-1",
					status: "PARSING",
					minioObjectKey: "records/record-1/generated.pdf",
					mimeType: "application/pdf",
					originalFileName: "file.pdf",
				},
			])
			prismaMock.record.update.mockResolvedValue({ id: "record-1" })
			redisMock.publishRecordReadyForParsing.mockResolvedValue(undefined)

			// Act
			const result = await service.confirmUpload("doc-1", "user-1")

			// Assert
			expect(result.status).toBe("PARSING")
			expect(result.allDocumentsReady).toBe(true)
			expect(prismaMock.record.update).toHaveBeenCalledWith({
				where: { id: "record-1" },
				data: { status: "PARSING" },
			})
			expect(redisMock.publishRecordReadyForParsing).toHaveBeenCalledWith({
				recordId: "record-1",
				userId: "user-1",
				documents: [
					{
						id: "doc-1",
						minioObjectKey: "records/record-1/generated.pdf",
						mimeType: "application/pdf",
						originalFileName: "file.pdf",
					},
				],
			})
		})

		it("should throw BadRequestException when file does not exist in storage", async () => {
			// Arrange
			prismaMock.document.findFirst.mockResolvedValue(createDocumentFixture())
			minioMock.fileExists.mockResolvedValue(false)

			// Act
			const call = service.confirmUpload("doc-1", "user-1")

			// Assert
			await expect(call).rejects.toThrow(BadRequestException)
		})
	})

	describe("event handlers", () => {
		it("should update document status from event", async () => {
			// Arrange
			prismaMock.document.update.mockResolvedValue(createDocumentFixture())

			// Act
			await service.updateDocumentStatusFromEvent(
				"doc-1",
				"FAILED",
				"parse failed",
				"PARSING",
			)

			// Assert
			expect(prismaMock.document.update).toHaveBeenCalledWith({
				where: { id: "doc-1" },
				data: {
					status: "FAILED",
					errorMessage: "parse failed",
					failedPhase: "PARSING",
				},
			})
		})

		it("should retry parsing and publish event", async () => {
			// Arrange
			prismaMock.document.findMany.mockResolvedValue([
				createDocumentFixture({
					id: "doc-failed",
					status: "FAILED",
					failedPhase: FailedPhase.PARSING,
				}),
			])
			prismaMock.document.updateMany.mockResolvedValue({ count: 1 })
			redisMock.publishRecordReadyForParsing.mockResolvedValue(undefined)

			// Act
			await service.handleRetryParsing("record-1", "user-1")

			// Assert
			expect(prismaMock.document.updateMany).toHaveBeenCalledWith({
				where: {
					id: { in: ["doc-failed"] },
				},
				data: {
					status: "PARSING",
					failedPhase: null,
					errorMessage: null,
				},
			})
			expect(redisMock.publishRecordReadyForParsing).toHaveBeenCalledTimes(1)
		})

		it("should retry AI and publish RECORD_READY_FOR_AI event", async () => {
			// Arrange
			prismaMock.document.findMany.mockResolvedValue([
				createDocumentFixture({
					id: "doc-ai",
					status: "FAILED",
					failedPhase: FailedPhase.PROCESSING,
				}),
			])
			prismaMock.document.updateMany.mockResolvedValue({ count: 1 })
			redisMock.publish.mockResolvedValue(undefined)

			// Act
			await service.handleRetryAi("record-1", "user-1")

			// Assert
			expect(redisMock.publish).toHaveBeenCalledWith(
				RedisChannels.RECORD_READY_FOR_AI,
				expect.objectContaining({
					recordId: "record-1",
					userId: "user-1",
					documentIds: ["doc-ai"],
				}),
			)
		})
	})
})
