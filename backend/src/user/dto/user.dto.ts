import { ApiProperty } from "@nestjs/swagger"
import {
	IsEmail,
	IsNotEmpty,
	IsOptional,
	IsString,
	MinLength,
} from "class-validator"

export class UserResponseDto {
	@ApiProperty({ example: "clxxx123456", description: "ID пользователя" })
	id: string

	@ApiProperty({
		example: "user@example.com",
		description: "Email пользователя",
	})
	email: string

	@ApiProperty({
		example: "John Doe",
		description: "Имя пользователя",
	})
	name: string

	@ApiProperty({
		example: "USER",
		description: "Роль пользователя",
		enum: ["USER", "ADMIN"],
	})
	role: string

	@ApiProperty({
		example: "2024-01-01T00:00:00.000Z",
		description: "Дата создания",
	})
	createdAt: Date

	@ApiProperty({
		example: "2024-01-01T00:00:00.000Z",
		description: "Дата обновления",
	})
	updatedAt: Date
}

export class CreateUserDto {
	@ApiProperty({
		example: "user@example.com",
		description: "Email пользователя",
	})
	@IsEmail()
	@IsNotEmpty()
	email: string

	@ApiProperty({
		example: "John Doe",
		description: "Имя пользователя",
	})
	@IsString()
	@IsNotEmpty()
	name: string

	@ApiProperty({
		example: "strongPassword123",
		description: "Пароль пользователя",
		minLength: 8,
	})
	@IsString()
	@MinLength(8, { message: "Пароль должен содержать минимум 8 символов" })
	@IsNotEmpty()
	password: string
}

export class UpdateUserDto {
	@ApiProperty({
		example: "user@example.com",
		description: "Email пользователя",
		required: false,
	})
	@IsEmail()
	@IsOptional()
	email?: string

	@ApiProperty({
		example: "John Doe",
		description: "Имя пользователя",
		required: false,
	})
	@IsString()
	@IsOptional()
	name?: string

	@ApiProperty({
		example: "newStrongPassword123",
		description: "Новый пароль пользователя",
		minLength: 8,
		required: false,
	})
	@IsString()
	@MinLength(8, { message: "Пароль должен содержать минимум 8 символов" })
	@IsOptional()
	password?: string
}
