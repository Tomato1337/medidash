import { ApiPropertyOptional } from "@nestjs/swagger"
import { Transform } from "class-transformer"
import {
	IsEnum,
	IsInt,
	IsISO8601,
	IsOptional,
	IsString,
	Max,
	MaxLength,
	Min,
} from "class-validator"
import { DocumentStatus } from "@shared-types"

export enum RecordSortBy {
	DATE = "date",
	CREATED_AT = "createdAt",
	TITLE = "title",
}

export enum SortDirection {
	ASC = "asc",
	DESC = "desc",
}

const ALLOWED_STATUS_VALUES = new Set<string>([
	DocumentStatus.COMPLETED,
	DocumentStatus.PROCESSING,
	DocumentStatus.PARSING,
	DocumentStatus.FAILED,
	DocumentStatus.UPLOADING,
])

export class GetRecordsQueryDto {
	@ApiPropertyOptional({
		example: 1,
		default: 1,
		description: "Номер страницы",
	})
	@IsOptional()
	@Transform(
		({ value }) => (value === undefined || value === "" ? 1 : Number(value)),
		{ toClassOnly: true },
	)
	@IsInt()
	@Min(1)
	page: number = 1

	@ApiPropertyOptional({
		example: 10,
		default: 10,
		description: "Количество записей на странице",
	})
	@IsOptional()
	@Transform(
		({ value }) => (value === undefined || value === "" ? 10 : Number(value)),
		{ toClassOnly: true },
	)
	@IsInt()
	@Min(1)
	@Max(100)
	limit: number = 10

	@ApiPropertyOptional({
		enum: RecordSortBy,
		default: RecordSortBy.DATE,
		description: "Поле сортировки",
	})
	@IsOptional()
	@IsEnum(RecordSortBy)
	sortBy: RecordSortBy = RecordSortBy.DATE

	@ApiPropertyOptional({
		enum: SortDirection,
		default: SortDirection.DESC,
		description: "Направление сортировки",
	})
	@IsOptional()
	@IsEnum(SortDirection)
	sortDir: SortDirection = SortDirection.DESC

	@ApiPropertyOptional({
		example: "2024-01-01T00:00:00.000Z",
		description: "Дата начала диапазона (ISO 8601)",
	})
	@IsOptional()
	@IsISO8601({ strict: true })
	dateFrom?: string

	@ApiPropertyOptional({
		example: "2024-12-31T23:59:59.999Z",
		description: "Дата конца диапазона (ISO 8601)",
	})
	@IsOptional()
	@IsISO8601({ strict: true })
	dateTo?: string

	@ApiPropertyOptional({
		example: "tag-1,tag-2,tag-3",
		description: "ID тегов через запятую",
	})
	@IsOptional()
	@IsString()
	tags?: string

	@ApiPropertyOptional({
		example: "COMPLETED,PROCESSING",
		description: "Статусы документов через запятую",
	})
	@IsOptional()
	@IsString()
	status?: string

	@ApiPropertyOptional({
		example: "общий анализ крови",
		maxLength: 200,
		description: "Поисковая строка",
	})
	@IsOptional()
	@IsString()
	@MaxLength(200)
	search?: string

	get tagIds(): string[] {
		if (!this.tags) {
			return []
		}

		return this.tags
			.split(",")
			.map((tagId) => tagId.trim())
			.filter((tagId) => tagId.length > 0)
	}

	get statusValues(): string[] {
		if (!this.status) {
			return []
		}

		return this.status
			.split(",")
			.map((value) => value.trim())
			.filter((value) => value.length > 0)
			.filter((value) => ALLOWED_STATUS_VALUES.has(value))
	}
}
