import { ApiProperty } from "@nestjs/swagger"
import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator"
import { UserResponseDto } from "src/user/dto/user.dto"

export class AuthLoginDto {
	@ApiProperty({
		example: "user@example.com",
		description: "Email пользователя",
	})
	@IsEmail()
	email: string

	@ApiProperty({
		example: "strongPassword123",
		description: "Пароль пользователя",
	})
	@IsString()
	@MinLength(8, { message: "Пароль должен содержать минимум 8 символов" })
	@IsNotEmpty()
	password: string
}

export class AuthRegisterDto {
	@ApiProperty({
		example: "user@example.com",
		description: "Email пользователя",
	})
	@IsEmail()
	email: string

	@ApiProperty({ example: "username", description: "Имя пользователя" })
	@IsString()
	@IsNotEmpty()
	name: string

	@ApiProperty({
		example: "strongPassword123",
		description: "Пароль пользователя",
	})
	@IsString()
	@MinLength(8, { message: "Пароль должен содержать минимум 8 символов" })
	password: string
}

// Response DTOs
export class AuthLoginResponseDto {
	@ApiProperty({ type: UserResponseDto, description: "Данные пользователя" })
	user: UserResponseDto

	@ApiProperty({
		example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
		description: "JWT access token",
	})
	accessToken: string
}

export class SignOutResponseDto {
	@ApiProperty({
		example: "Successfully signed out",
		description: "Сообщение о результате",
	})
	message: string
}
