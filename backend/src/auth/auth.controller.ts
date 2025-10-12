/*
https://docs.nestjs.com/controllers#controllers
*/

import { Body, Controller, Post, Req, Res, UseGuards } from "@nestjs/common"
import { AuthService } from "./auth.service"
import { AuthRegisterDto } from "./dto/auth.dto"
import { LocalAuthGuard } from "./guards/local-auth.guard"
import { JwtAuthGuard } from "./guards/jwt-auth.guard"
import { JwtRefreshAuthGuard } from "./guards/jwt-refresh-auth.guard"
import { CurrentUser } from "./decorators/current-user.decorator"
import type { FastifyReply, FastifyRequest } from "fastify"
import type { User } from "generated/prisma"

@Controller("auth")
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Post("register")
	async register(
		@Body() body: AuthRegisterDto,
		@Res({ passthrough: true }) reply: FastifyReply,
	) {
		return this.authService.register(body, reply)
	}

	@Post("login")
	@UseGuards(LocalAuthGuard)
	async login(
		@CurrentUser() user: User,
		@Res({ passthrough: true }) reply: FastifyReply,
	) {
		return this.authService.login(user, reply)
	}

	@Post("refresh")
	@UseGuards(JwtRefreshAuthGuard)
	async refresh(
		@CurrentUser() user: User,
		@Res({ passthrough: true }) reply: FastifyReply,
	) {
		return this.authService.login(user, reply)
	}

	@Post("signout")
	@UseGuards(JwtAuthGuard)
	async signOut(
		@CurrentUser() user: User,
		@Res({ passthrough: true }) reply: FastifyReply,
		@Req() request: FastifyRequest,
	) {
		return this.authService.signOut(user.id, reply, request)
	}

	@Post("signout-all-devices")
	@UseGuards(JwtAuthGuard)
	async signOutAllDevices(
		@CurrentUser() user: User,
		@Res({ passthrough: true }) reply: FastifyReply,
		@Req() request: FastifyRequest,
	) {
		return this.authService.signOut(user.id, reply, request, true)
	}
}
