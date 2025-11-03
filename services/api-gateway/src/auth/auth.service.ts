/*
https://docs.nestjs.com/providers#services
*/

import { Injectable, Logger, UnauthorizedException } from "@nestjs/common"
import { AuthRegisterDto } from "./dto/auth.dto"
import { UserService } from "src/user/user.service"
import { JwtService } from "@nestjs/jwt"
import { EnvService } from "src/env/env.service"
import { PrismaService } from "src/prisma.service"
import { FastifyReply, FastifyRequest } from "fastify"
import { compare, hash } from "bcryptjs"
import { User } from "generated/prisma"
import { UserResponseDto } from "src/user/dto/user.dto"

@Injectable()
export class AuthService {
	private readonly logger = new Logger(AuthService.name)

	constructor(
		private userService: UserService,
		private jwtService: JwtService,
		private configService: EnvService,
		private prisma: PrismaService,
	) {}

	async login(user: User, reply: FastifyReply) {
		try {
			const expiresIn: string =
				this.configService.get("JWT_EXPIRES_IN") || "15m"
			const refreshExpiresIn: string =
				this.configService.get("JWT_REFRESH_EXPIRES_IN") || "7d"

			// Convert expires in to milliseconds
			const expirationMs = this.parseExpirationTime(expiresIn)
			const refreshExpirationMs =
				this.parseExpirationTime(refreshExpiresIn)

			const expiresAccessToken = new Date(Date.now() + expirationMs)
			const expiresRefreshToken = new Date(
				Date.now() + refreshExpirationMs,
			)

			const tokenPayload = {
				userId: user.id,
			}

			const accessToken = this.jwtService.sign(tokenPayload, {
				secret: this.configService.get("JWT_SECRET"),
				expiresIn: expirationMs,
			})

			const refreshToken = this.jwtService.sign(tokenPayload, {
				secret: this.configService.get("JWT_REFRESH_SECRET"),
				expiresIn: refreshExpirationMs,
			})

			const userData: UserResponseDto = {
				id: user.id,
				email: user.email,
				name: user.name,
				role: user.role,
				createdAt: user.createdAt,
				updatedAt: user.updatedAt,
			}

			await this.prisma.refreshToken.create({
				data: {
					token: await hash(refreshToken, 10),
					userId: user.id,
					expiresAt: expiresRefreshToken,
				},
			})

			const isProduction = this.configService.get("NODE_ENV") === "prod"

			reply.setCookie("Authentication", accessToken, {
				httpOnly: true,
				secure: isProduction,
				expires: expiresAccessToken,
				path: "/",
				sameSite: "lax",
			})

			reply.setCookie("Refresh", refreshToken, {
				httpOnly: true,
				secure: isProduction,
				expires: expiresRefreshToken,
				path: "/",
				sameSite: "lax",
			})

			return {
				user: userData,
				accessToken,
			}
		} catch (error) {
			this.logger.error("Login error:", {
				error: error instanceof Error ? error.message : "Unknown error",
				userId: user.id,
				stack: error instanceof Error ? error.stack : undefined,
			})
			throw new UnauthorizedException(
				"Failed to process login. Please try again.",
			)
		}
	}

	/**
	 * Parse expiration time string to milliseconds
	 * Supports: 15m, 7d, 1h, 30s
	 */
	private parseExpirationTime(expiresIn: string): number {
		const match = expiresIn.match(/^(\d+)([smhd])$/)
		if (!match) {
			throw new Error(`Invalid expiration time format: ${expiresIn}`)
		}

		const value = parseInt(match[1], 10)
		const unit = match[2]

		const multipliers = {
			s: 1000,
			m: 60 * 1000,
			h: 60 * 60 * 1000,
			d: 24 * 60 * 60 * 1000,
		}

		return value * multipliers[unit as keyof typeof multipliers]
	}

	async verifyUser(email: string, password: string): Promise<User> {
		try {
			const user = await this.userService.getUserByEmail(email)
			const authenticated = await compare(password, user.password)
			if (!authenticated) {
				throw new UnauthorizedException()
			}
			return user
		} catch (error) {
			this.logger.error("Verify user error", error)
			throw new UnauthorizedException("Credentials are not valid")
		}
	}

	async verifyUserRefreshToken(
		refreshToken: string,
		userId: string,
	): Promise<UserResponseDto> {
		try {
			const user = await this.userService.getUserById(userId)

			const tokens = await this.prisma.refreshToken.findMany({
				where: {
					userId: user.id,
					expiresAt: {
						gt: new Date(),
					},
				},
			})

			let refreshTokenMatches = false
			for (const tokenRecord of tokens) {
				if (await compare(refreshToken, tokenRecord.token)) {
					refreshTokenMatches = true
					break
				}
			}

			if (!refreshTokenMatches) {
				throw new UnauthorizedException()
			}

			return user
		} catch (error) {
			this.logger.error("Verify user refresh token error", error)
			throw new UnauthorizedException("Refresh token is not valid")
		}
	}

	async signOut(
		userId: string,
		reply: FastifyReply,
		request: FastifyRequest,
		signOutAllDevices = false,
	) {
		try {
			if (signOutAllDevices) {
				await this.prisma.refreshToken.deleteMany({
					where: { userId },
				})
			} else {
				const refreshToken = request.cookies?.Refresh

				if (refreshToken) {
					const tokens = await this.prisma.refreshToken.findMany({
						where: { userId },
					})

					for (const tokenRecord of tokens) {
						if (await compare(refreshToken, tokenRecord.token)) {
							await this.prisma.refreshToken.delete({
								where: { id: tokenRecord.id },
							})
							break
						}
					}
				}
			}

			reply.clearCookie("Authentication")
			reply.clearCookie("Refresh")
			return { message: "Successfully signed out" }
		} catch (error) {
			this.logger.error("Sign out error:", {
				error: error instanceof Error ? error.message : "Unknown error",
				userId,
				stack: error instanceof Error ? error.stack : undefined,
			})
			throw new UnauthorizedException("Failed to process sign out")
		}
	}

	async register(body: AuthRegisterDto, reply: FastifyReply) {
		try {
			const existingUser = await this.prisma.user.findUnique({
				where: { email: body.email },
			})

			if (existingUser) {
				throw new UnauthorizedException(
					"Пользователь с таким email уже существует",
				)
			}

			const hashedPassword = await hash(body.password, 10)

			const user = await this.prisma.user.create({
				data: {
					email: body.email,
					name: body.name,
					password: hashedPassword,
				},
			})

			return this.login(user, reply)
		} catch (error) {
			this.logger.error("Registration error:", {
				error: error instanceof Error ? error.message : "Unknown error",
				email: body.email,
				stack: error instanceof Error ? error.stack : undefined,
			})

			if (error instanceof UnauthorizedException) {
				throw error
			}

			throw new UnauthorizedException(
				"Не удалось зарегистрировать пользователя. Попробуйте снова.",
			)
		}
	}
}
