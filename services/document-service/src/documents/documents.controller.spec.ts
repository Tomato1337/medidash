import { Test, TestingModule } from "@nestjs/testing"
import {
	BadRequestException,
	UnauthorizedException,
} from "@nestjs/common"
import { describe, it, expect, beforeEach, vi } from "vitest"
import type { AuthenticatedUser } from "@shared-types"
import { Readable } from "stream"
import { DocumentsController } from "./documents.controller"
import { DocumentsService } from "./documents.service"
import { GetPresignedUrlDto } from "./dto/document.dto"

describe("DocumentsController", () => {
	let controller: DocumentsController

	const documentsServiceMock = {
		uploadDocumentStream: vi.fn(),
		getUploadUrl: vi.fn(),
		confirmUpload: vi.fn(),
		getRecordDocuments: vi.fn(),
		getDocument: vi.fn(),
		downloadDocument: vi.fn(),
		getDownloadUrl: vi.fn(),
		deleteDocument: vi.fn(),
	}

	beforeEach(async () => {
		vi.clearAllMocks()

		const module: TestingModule = await Test.createTestingModule({
			controllers: [DocumentsController],
			providers: [
				{
					provide: DocumentsService,
					useValue: documentsServiceMock,
				},
			],
		}).compile()

		controller = module.get<DocumentsController>(DocumentsController)
	})

	it("should throw UnauthorizedException for uploadDocument when user missing", async () => {
		// Arrange
		const req = {
			file: vi.fn(),
		} as unknown

		// Act
		const call = controller.uploadDocument(req as any, null)

		// Assert
		await expect(call).rejects.toThrow(UnauthorizedException)
	})

	it("should throw BadRequestException when uploadDocument has no file", async () => {
		// Arrange
		const req = {
			file: vi.fn().mockResolvedValue(null),
		} as unknown
		const user = { id: "user-1" } as AuthenticatedUser

		// Act
		const call = controller.uploadDocument(req as any, user)

		// Assert
		await expect(call).rejects.toThrow(BadRequestException)
	})

	it("should delegate uploadDocument to service with multipart fields", async () => {
		// Arrange
		const user = { id: "user-1" } as AuthenticatedUser
		const stream = Readable.from([Buffer.from("content")])
		const req = {
			file: vi.fn().mockResolvedValue({
				filename: "report.pdf",
				mimetype: "application/pdf",
				file: stream,
				fields: {
					recordId: { value: "record-1" },
					description: { value: "Описание" },
				},
			}),
		} as unknown

		documentsServiceMock.uploadDocumentStream.mockResolvedValue({ id: "doc-1" })

		// Act
		await controller.uploadDocument(req as any, user)

		// Assert
		expect(documentsServiceMock.uploadDocumentStream).toHaveBeenCalledWith(
			"user-1",
			"record-1",
			expect.objectContaining({
				filename: "report.pdf",
				mimetype: "application/pdf",
			}),
			"Описание",
		)
	})

	it("should delegate getUploadUrl", async () => {
		// Arrange
		const user = { id: "user-2" } as AuthenticatedUser
		const dto: GetPresignedUrlDto = {
			recordId: "record-1",
			filename: "large.pdf",
			mimetype: "application/pdf",
			fileSize: 12345,
		}
		documentsServiceMock.getUploadUrl.mockResolvedValue({
			uploadUrl: "url",
			documentId: "doc-1",
			objectKey: "key",
			expiresIn: 300,
		})

		// Act
		await controller.getUploadUrl(user, dto)

		// Assert
		expect(documentsServiceMock.getUploadUrl).toHaveBeenCalledWith(
			"user-2",
			"record-1",
			"large.pdf",
			"application/pdf",
			12345,
		)
	})

	it("should delegate confirmUpload", async () => {
		// Arrange
		const user = { id: "user-3" } as AuthenticatedUser
		documentsServiceMock.confirmUpload.mockResolvedValue({ id: "doc-5" })

		// Act
		await controller.confirmUpload("doc-5", user)

		// Assert
		expect(documentsServiceMock.confirmUpload).toHaveBeenCalledWith(
			"doc-5",
			"user-3",
		)
	})

	it("should delegate getRecordDocuments", async () => {
		// Arrange
		const user = { id: "user-4" } as AuthenticatedUser
		documentsServiceMock.getRecordDocuments.mockResolvedValue([])

		// Act
		await controller.getRecordDocuments("record-9", user)

		// Assert
		expect(documentsServiceMock.getRecordDocuments).toHaveBeenCalledWith(
			"record-9",
			"user-4",
		)
	})

	it("should delegate getDocument", async () => {
		// Arrange
		const user = { id: "user-5" } as AuthenticatedUser
		documentsServiceMock.getDocument.mockResolvedValue({ id: "doc-6" })

		// Act
		await controller.getDocument("doc-6", user)

		// Assert
		expect(documentsServiceMock.getDocument).toHaveBeenCalledWith(
			"doc-6",
			"user-5",
		)
	})

	it("should set headers and send buffer in downloadDocument", async () => {
		// Arrange
		const user = { id: "user-6" } as AuthenticatedUser
		const reply = {
			header: vi.fn().mockReturnThis(),
			send: vi.fn(),
		}
		const buffer = Buffer.from("file")
		documentsServiceMock.downloadDocument.mockResolvedValue({
			buffer,
			filename: "file.pdf",
			mimetype: "application/pdf",
		})

		// Act
		await controller.downloadDocument("doc-7", user, reply as any)

		// Assert
		expect(reply.header).toHaveBeenCalledWith(
			"Content-Type",
			"application/pdf",
		)
		expect(reply.header).toHaveBeenCalledWith(
			"Content-Disposition",
			'attachment; filename="file.pdf"',
		)
		expect(reply.send).toHaveBeenCalledWith(buffer)
	})

	it("should delegate getDownloadUrl", async () => {
		// Arrange
		const user = { id: "user-7" } as AuthenticatedUser
		documentsServiceMock.getDownloadUrl.mockResolvedValue({
			downloadUrl: "https://url",
			expiresIn: 3600,
			filename: "file.pdf",
			mimeType: "application/pdf",
		})

		// Act
		await controller.getDownloadUrl("doc-8", user)

		// Assert
		expect(documentsServiceMock.getDownloadUrl).toHaveBeenCalledWith(
			"doc-8",
			"user-7",
		)
	})

	it("should delegate deleteDocument", async () => {
		// Arrange
		const user = { id: "user-8" } as AuthenticatedUser
		documentsServiceMock.deleteDocument.mockResolvedValue(undefined)

		// Act
		await controller.deleteDocument("doc-9", user)

		// Assert
		expect(documentsServiceMock.deleteDocument).toHaveBeenCalledWith(
			"doc-9",
			"user-8",
		)
	})
})
