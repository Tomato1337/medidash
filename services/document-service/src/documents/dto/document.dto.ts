import { IsString, IsOptional, MaxLength, IsNumber } from "class-validator"
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"

export class UploadDocumentDto {
	@ApiProperty({ example: "record-id-123" })
	@IsString()
	recordId: string

	@ApiPropertyOptional({ example: "Анализ крови.pdf" })
	@IsOptional()
	@IsString()
	@MaxLength(255)
	filename?: string

	@ApiPropertyOptional({ example: "Общий анализ крови от 15.01.2024" })
	@IsOptional()
	@IsString()
	@MaxLength(500)
	description?: string
}

export class GetPresignedUrlDto {
	@ApiProperty({ example: "large-document.pdf" })
	@IsString()
	filename: string

	@ApiProperty({ example: "application/pdf" })
	@IsString()
	mimetype: string

	@ApiProperty({ example: 10485760 }) // 10 MB
	@IsNumber()
	fileSize: number

	@ApiProperty({ example: "record-id-123" })
	@IsString()
	recordId: string
}

export class DocumentResponseDto {
	@ApiProperty()
	id: string

	@ApiProperty()
	recordId: string

	@ApiProperty({ required: false })
	title: string | null

	@ApiProperty()
	fileName: string

	@ApiProperty()
	originalFileName: string

	@ApiProperty()
	mimeType: string

	@ApiProperty()
	fileSize: number

	@ApiProperty({ required: false })
	description: string | null

	@ApiProperty({ enum: ["UPLOADING", "PROCESSING", "COMPLETED", "FAILED"] })
	status: string

	@ApiProperty({ required: false })
	errorMessage: string | null

	@ApiProperty({ required: false })
	processedAt: Date | null

	@ApiProperty()
	createdAt: Date

	@ApiProperty()
	updatedAt: Date
}
