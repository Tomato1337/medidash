import {
	IsString,
	IsOptional,
	MaxLength,
	IsArray,
	IsUUID,
	ArrayMaxSize,
	IsDateString,
} from "class-validator"
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { TagResponseDto } from "src/tags/dto/tags.dto"

export class CreateRecordDto {
	@ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
	@IsUUID()
	recordId: string

	@ApiProperty({ example: "Анализы за январь 2024" })
	@IsString()
	@MaxLength(255)
	title: string

	@ApiPropertyOptional({ example: "Результаты общего анализа крови" })
	@IsOptional()
	@IsString()
	@MaxLength(1000)
	description?: string

	@ApiPropertyOptional({
		example: ["cmi6hd9110000f3gmj00bvhnu", "cmi6hd91m0001f3gmxk7t6nk3"],
	})
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	@ArrayMaxSize(20)
	tags?: string[]

	@ApiPropertyOptional({ example: "2024-01-15T00:00:00.000Z" })
	@IsOptional()
	@IsDateString()
	date?: string | Date
}

export class UpdateRecordDto {
	@ApiPropertyOptional({ example: "Анализы за февраль 2024" })
	@IsOptional()
	@IsString()
	@MaxLength(255)
	title?: string

	@ApiPropertyOptional({ example: "Обновленное описание" })
	@IsOptional()
	@IsString()
	@MaxLength(1000)
	description?: string

	@ApiPropertyOptional({
		example: ["cmi6hd9110000f3gmj00bvhnu", "cmi6hd91m0001f3gmxk7t6nk3"],
	})
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	@ArrayMaxSize(20)
	tags?: string[]
}

export class RecordResponseDto {
	@ApiProperty()
	id: string

	@ApiProperty()
	userId: string

	@ApiProperty()
	title: string

	@ApiProperty({ required: false })
	description: string | null

	@ApiProperty({ required: false })
	date: Date | null

	@ApiProperty({ required: false })
	summary: string | null

	@ApiProperty()
	createdAt: Date

	@ApiProperty({ type: [Object] })
	documents?: Array<{
		status: string
		fileSize: number
		fileName: string
		originalFileName: string
		failedPhase?: string | null
	}>

	@ApiProperty()
	status: string

	@ApiProperty({
		required: false,
		description: "Фаза, на которой произошла ошибка (PARSING | PROCESSING))",
	})
	failedPhase?: string | null

	@ApiProperty()
	updatedAt: Date

	@ApiProperty({ type: [String] })
	tags: TagResponseDto[]

	@ApiProperty()
	documentCount: number
}

export class RecordsUsersResponseDto {
	@ApiProperty({ type: [RecordResponseDto] })
	data: RecordResponseDto[]

	@ApiProperty()
	page: number

	@ApiProperty()
	limit: number

	@ApiProperty()
	total: number
}
