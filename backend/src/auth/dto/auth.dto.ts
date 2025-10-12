import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator"

export class AuthLoginDto {
	@IsEmail()
	email: string

	@IsNotEmpty()
	password: string
}

export class AuthRegisterDto {
	@IsEmail()
	email: string

	@IsString()
	@IsNotEmpty()
	name: string

	@IsString()
	@MinLength(6, { message: "Пароль должен содержать минимум 6 символов" })
	password: string
}
