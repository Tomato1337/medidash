/*
https://docs.nestjs.com/controllers#controllers
*/

import { Controller, Get, UseGuards } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"
import { UserService } from "./user.service"
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard"
import { CurrentUser } from "src/auth/decorators/current-user.decorator"
import { UserResponseDto } from "./dto/user.dto"
import type { User } from "generated/prisma"

@ApiTags("user")
@Controller("user")
export class UserController {
	constructor(private userService: UserService) {}

	@Get()
	@UseGuards(JwtAuthGuard)
	@ApiOperation({ summary: "Получить данные текущего пользователя" })
	@ApiResponse({
		status: 200,
		description: "Данные пользователя успешно получены",
		type: UserResponseDto,
	})
	@ApiResponse({ status: 401, description: "Не авторизован" })
	@ApiResponse({ status: 404, description: "Пользователь не найден" })
	async getUser(@CurrentUser() user: User): Promise<UserResponseDto> {
		return this.userService.getUserById(user.id)
	}
}
