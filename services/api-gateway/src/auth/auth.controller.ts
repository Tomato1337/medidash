/*
https://docs.nestjs.com/controllers#controllers
*/

import { Body, Controller, Post, Req, Res, UseGuards } from "@nestjs/common"
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"
import { AuthService } from "./auth.service"
import {
	AuthLoginDto,
	AuthLoginResponseDto,
	AuthRegisterDto,
	SignOutResponseDto,
} from "./dto/auth.dto"
import { LocalAuthGuard } from "./guards/local-auth.guard"
import { JwtAuthGuard } from "./guards/jwt-auth.guard"
import { JwtRefreshAuthGuard } from "./guards/jwt-refresh-auth.guard"
import { CurrentUser } from "./decorators/current-user.decorator"
import type { FastifyReply, FastifyRequest } from "fastify"
import type { User } from "generated/prisma"

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Post("register")
	@ApiOperation({ summary: "Регистрация нового пользователя" })
	@ApiResponse({
		status: 201,
		description: "Пользователь успешно зарегистрирован",
		type: AuthLoginResponseDto,
	})
	@ApiResponse({ status: 400, description: "Некорректные данные" })
	@ApiResponse({
		status: 409,
		description: "Пользователь с таким email уже существует",
	})
	async register(
		@Body() body: AuthRegisterDto,
		@Res({ passthrough: true }) reply: FastifyReply,
	): Promise<AuthLoginResponseDto> {
		return this.authService.register(body, reply)
	}

	@Post("login")
	@UseGuards(LocalAuthGuard)
	@ApiOperation({ summary: "Вход в систему" })
	@ApiBody({ type: AuthLoginDto })
	@ApiResponse({
		status: 200,
		description: "Успешный вход",
		type: AuthLoginResponseDto,
	})
	@ApiResponse({ status: 401, description: "Неверные учетные данные" })
	async login(
		@CurrentUser() user: User,
		@Res({ passthrough: true }) reply: FastifyReply,
	): Promise<AuthLoginResponseDto> {
		return this.authService.login(user, reply)
	}

	@Post("refresh")
	@UseGuards(JwtRefreshAuthGuard)
	@ApiOperation({ summary: "Обновление токена доступа" })
	@ApiResponse({
		status: 200,
		description: "Токен успешно обновлен",
		type: AuthLoginResponseDto,
	})
	@ApiResponse({ status: 401, description: "Невалидный refresh token" })
	async refresh(
		@CurrentUser() user: User,
		@Res({ passthrough: true }) reply: FastifyReply,
	): Promise<AuthLoginResponseDto> {
		console.log(user)
		return this.authService.login(user, reply)
	}

	@Post("signout")
	@UseGuards(JwtAuthGuard)
	@ApiOperation({ summary: "Выход из системы (текущее устройство)" })
	@ApiResponse({
		status: 200,
		description: "Успешный выход",
		type: SignOutResponseDto,
	})
	@ApiResponse({ status: 401, description: "Не авторизован" })
	async signOut(
		@CurrentUser() user: User,
		@Res({ passthrough: true }) reply: FastifyReply,
		@Req() request: FastifyRequest,
	): Promise<SignOutResponseDto> {
		return this.authService.signOut(user.id, reply, request)
	}

	@Post("signout-all-devices")
	@UseGuards(JwtAuthGuard)
	@ApiOperation({ summary: "Выход из системы на всех устройствах" })
	@ApiResponse({
		status: 200,
		description: "Успешный выход со всех устройств",
		type: SignOutResponseDto,
	})
	@ApiResponse({ status: 401, description: "Не авторизован" })
	async signOutAllDevices(
		@CurrentUser() user: User,
		@Res({ passthrough: true }) reply: FastifyReply,
		@Req() request: FastifyRequest,
	): Promise<SignOutResponseDto> {
		return this.authService.signOut(user.id, reply, request, true)
	}
}
