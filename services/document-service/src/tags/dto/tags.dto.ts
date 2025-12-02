import { ApiProperty } from "@nestjs/swagger"

export class TagResponseDto {
	@ApiProperty({ example: "cmi6hd9110000f3gmj00bvhnu" })
	id: string

	@ApiProperty({ example: "Анализы" })
	name: string

	@ApiProperty({
		example: "Результаты лабораторных анализов",
		required: false,
		nullable: true,
	})
	description: string | null

	@ApiProperty({ example: "#3B82F6", required: false, nullable: true })
	color: string | null

	@ApiProperty({ example: true })
	isSystem: boolean

	@ApiProperty({ example: "2025-11-19T20:54:20.915Z" })
	createdAt: Date

	@ApiProperty({ example: "2025-11-19T20:54:20.915Z" })
	updatedAt: Date
}
