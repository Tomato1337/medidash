/*
https://docs.nestjs.com/controllers#controllers
*/

import { Controller, Get, UseGuards } from "@nestjs/common"
import { UserService } from "./user.service"
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard"
import { CurrentUser } from "src/auth/decorators/current-user.decorator"
import type { User } from "generated/prisma"

@Controller("user")
export class UserController {
	constructor(private userService: UserService) {}

	@Get()
	@UseGuards(JwtAuthGuard)
	getUser(@CurrentUser() user: User) {
		return this.userService.getUserById(user.id)
	}
}
