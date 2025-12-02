import {
	Controller,
	Get,
	Post,
	Delete,
	Param,
	UnauthorizedException,
	BadRequestException,
	Req,
	Res,
	Body,
} from "@nestjs/common"
import {
	ApiTags,
	ApiOperation,
	ApiResponse,
	ApiBearerAuth,
	ApiConsumes,
} from "@nestjs/swagger"
import type { FastifyRequest, FastifyReply } from "fastify"
import { DocumentsService } from "./documents.service"
import { DocumentResponseDto, GetPresignedUrlDto } from "./dto/document.dto"
import { CurrentUser } from "../common/decorators/current-user.decorator"
import type { AuthenticatedUser } from "@shared-types"

@ApiTags("Documents")
@Controller("documents")
@ApiBearerAuth()
export class DocumentsController {
	constructor(private documentsService: DocumentsService) {}

	@Post("upload")
	@ApiOperation({
		summary: "Upload document to record using streaming (recommended)",
	})
	@ApiConsumes("multipart/form-data")
	@ApiResponse({ status: 201, type: DocumentResponseDto })
	async uploadDocument(
		@Req() req: FastifyRequest,
		@CurrentUser() user: AuthenticatedUser | null,
	): Promise<DocumentResponseDto> {
		if (!user) {
			throw new UnauthorizedException("User ID not provided")
		}

		const data = await req.file()

		if (!data) {
			throw new BadRequestException("No file provided")
		}

		// Получаем поля из multipart
		const recordIdField = data.fields["recordId"] as any
		const descriptionField = data.fields["description"] as any

		const recordId = recordIdField?.value
		const description = descriptionField?.value

		if (!recordId) {
			throw new BadRequestException("recordId is required")
		}

		// Используем streaming вместо buffer
		return this.documentsService.uploadDocumentStream(
			user.id,
			recordId,
			{
				filename: data.filename,
				mimetype: data.mimetype,
				file: data.file, // Передаем stream напрямую
			},
			description,
		)
	}

	@Post("upload-url")
	@ApiOperation({
		summary: "Get pre-signed URL for direct upload (for large files >10MB)",
	})
	@ApiResponse({
		status: 200,
		description: "Returns upload URL and document ID",
	})
	async getUploadUrl(
		@CurrentUser() user: AuthenticatedUser | null,
		@Body() body: GetPresignedUrlDto,
	): Promise<{
		uploadUrl: string
		documentId: string
		objectKey: string
		expiresIn: number
	}> {
		if (!user) {
			throw new UnauthorizedException("User ID not provided")
		}

		return this.documentsService.getUploadUrl(
			user.id,
			body.recordId,
			body.filename,
			body.mimetype,
			body.fileSize,
		)
	}

	@Get(":id/confirm")
	@ApiOperation({
		summary: "Confirm upload completion (for pre-signed URL uploads)",
	})
	@ApiResponse({ status: 200, type: DocumentResponseDto })
	async confirmUpload(
		@Param("id") id: string,
		@CurrentUser() user: AuthenticatedUser | null,
	): Promise<DocumentResponseDto> {
		if (!user) {
			throw new UnauthorizedException("User ID not provided")
		}

		return this.documentsService.confirmUpload(id, user.id)
	}

	@Get("record/:recordId")
	@ApiOperation({ summary: "Get all documents in record" })
	@ApiResponse({ status: 200, type: [DocumentResponseDto] })
	async getRecordDocuments(
		@Param("recordId") recordId: string,
		@CurrentUser() user: AuthenticatedUser | null,
	): Promise<DocumentResponseDto[]> {
		if (!user) {
			throw new UnauthorizedException("User ID not provided")
		}
		return this.documentsService.getRecordDocuments(recordId, user.id)
	}

	@Get(":id")
	@ApiOperation({ summary: "Get document metadata" })
	@ApiResponse({ status: 200, type: DocumentResponseDto })
	async getDocument(
		@Param("id") id: string,
		@CurrentUser() user: AuthenticatedUser | null,
	): Promise<DocumentResponseDto> {
		if (!user) {
			throw new UnauthorizedException("User ID not provided")
		}
		return this.documentsService.getDocument(id, user.id)
	}

	@Get(":id/download")
	@ApiOperation({ summary: "Download document file" })
	@ApiResponse({ status: 200, description: "File stream" })
	async downloadDocument(
		@Param("id") id: string,
		@CurrentUser() user: AuthenticatedUser | null,
		@Res({ passthrough: true }) reply: FastifyReply,
	): Promise<void> {
		if (!user) {
			throw new UnauthorizedException("User ID not provided")
		}

		const { buffer, filename, mimetype } =
			await this.documentsService.downloadDocument(id, user.id)

		reply
			.header("Content-Type", mimetype)
			.header("Content-Disposition", `attachment; filename="${filename}"`)
			.send(buffer)
	}

	@Get(":id/download-url")
	@ApiOperation({
		summary: "Get presigned download URL (recommended for security)",
	})
	@ApiResponse({
		status: 200,
		description: "Returns temporary download URL",
		schema: {
			type: "object",
			properties: {
				downloadUrl: { type: "string" },
				expiresIn: { type: "number" },
				filename: { type: "string" },
				mimeType: { type: "string" },
			},
		},
	})
	async getDownloadUrl(
		@Param("id") id: string,
		@CurrentUser() user: AuthenticatedUser | null,
	): Promise<{
		downloadUrl: string
		expiresIn: number
		filename: string
		mimeType: string
	}> {
		if (!user) {
			throw new UnauthorizedException("User ID not provided")
		}

		return this.documentsService.getDownloadUrl(id, user.id)
	}

	@Delete(":id")
	@ApiOperation({ summary: "Delete document" })
	@ApiResponse({ status: 204 })
	async deleteDocument(
		@Param("id") id: string,
		@CurrentUser() user: AuthenticatedUser | null,
	): Promise<void> {
		if (!user) {
			throw new UnauthorizedException("User ID not provided")
		}
		return this.documentsService.deleteDocument(id, user.id)
	}
}
