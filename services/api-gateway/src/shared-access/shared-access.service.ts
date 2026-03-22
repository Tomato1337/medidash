import {
	Injectable,
	Logger,
	NotFoundException,
	UnauthorizedException,
	ForbiddenException,
	OnModuleDestroy,
} from "@nestjs/common"
import { PrismaService } from "src/prisma.service"
import { EnvService } from "src/env/env.service"
import {
	CreateSharedAccessDto,
	CreateSharedAccessResponseDto,
	SharedAccessResponseDto,
	SharedAccessSessionResponseDto,
	SharedAccessInfoResponseDto,
} from "./dto/shared-access.dto"
import { compare, hash } from "bcryptjs"
import { randomBytes } from "crypto"
import { JwtService } from "@nestjs/jwt"
import type { FastifyReply, FastifyRequest } from "fastify"
import { SseService } from "src/sse/sse.service"
import Redis from "ioredis"

const SHARED_ACCESS_STATUS = {
	ACTIVE: "ACTIVE",
	REVOKED: "REVOKED",
	EXPIRED: "EXPIRED",
} as const

@Injectable()
export class SharedAccessService implements OnModuleDestroy {
	private readonly logger = new Logger(SharedAccessService.name)
	private readonly redisClient: Redis
	constructor(
		private readonly prisma: PrismaService,
		private readonly envService: EnvService,
		private readonly jwtService: JwtService,
		private readonly sseService: SseService,
	) {
		this.redisClient = new Redis({
			host: this.envService.get("REDIS_HOST"),
			port: this.envService.get("REDIS_PORT"),
		})
	}

	async createSharedAccess(
		userId: string,
		dto: CreateSharedAccessDto,
	): Promise<CreateSharedAccessResponseDto> {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
		})

		if (!user) {
			throw new NotFoundException("User not found")
		}

		const passwordMatches = await compare(
			dto.currentPassword,
			user.password,
		)
		if (!passwordMatches) {
			throw new UnauthorizedException("Invalid current password")
		}

		const generatedPassword = this.generatePassword()
		const passwordHash = await hash(generatedPassword, 10)
		const token = this.generateToken()
		const expiresAt = new Date(Date.now() + dto.durationDays * 86400000)

		const sharedAccess = await this.prisma.sharedAccess.create({
			data: {
				userId,
				name: dto.name,
				token,
				passwordHash,
				expiresAt,
			},
		})

		return {
			...this.mapSharedAccessResponse(sharedAccess, 0),
			generatedPassword,
		}
	}

	async listSharedAccesses(
		userId: string,
	): Promise<SharedAccessResponseDto[]> {
		const sharedAccesses = await this.prisma.sharedAccess.findMany({
			where: { userId },
			orderBy: { createdAt: "desc" },
		})

		if (sharedAccesses.length === 0) {
			return []
		}

		const sessionCounts =
			await this.prisma.sharedAccessRefreshToken.groupBy({
				by: ["sharedAccessId"],
				where: {
					sharedAccessId: { in: sharedAccesses.map((a) => a.id) },
					expiresAt: { gt: new Date() },
				},
				_count: { _all: true },
			})

		const countMap = new Map(
			sessionCounts.map((item) => [
				item.sharedAccessId,
				item._count._all,
			]),
		)

		return sharedAccesses.map((access) =>
			this.mapSharedAccessResponse(access, countMap.get(access.id) ?? 0),
		)
	}

	async revokeSharedAccess(userId: string, accessId: string) {
		const access = await this.prisma.sharedAccess.findUnique({
			where: { id: accessId },
		})

		if (!access) {
			throw new NotFoundException("Shared access not found")
		}

		if (access.userId !== userId) {
			throw new ForbiddenException("Access denied")
		}

		await this.prisma.sharedAccess.update({
			where: { id: accessId },
			data: { status: SHARED_ACCESS_STATUS.REVOKED },
		})

		await this.prisma.sharedAccessRefreshToken.deleteMany({
			where: { sharedAccessId: accessId },
		})

		return { message: "Access revoked" }
	}

	async getSharedAccessInfo(
		token: string,
	): Promise<SharedAccessInfoResponseDto> {
		const access = await this.prisma.sharedAccess.findUnique({
			where: { token },
			include: { user: true },
		})

		if (!access) {
			throw new NotFoundException("Shared access not found")
		}

		const status = this.resolvePublicStatus(access.status, access.expiresAt)

		return {
			ownerName: access.user.name,
			status,
			ownerId: access.userId,
		}
	}

	async listSessions(
		userId: string,
		accessId: string,
	): Promise<SharedAccessSessionResponseDto[]> {
		const access = await this.prisma.sharedAccess.findUnique({
			where: { id: accessId },
		})

		if (!access) {
			throw new NotFoundException("Shared access not found")
		}

		if (access.userId !== userId) {
			throw new ForbiddenException("Access denied")
		}

		const sessions = await this.prisma.sharedAccessRefreshToken.findMany({
			where: {
				sharedAccessId: accessId,
				expiresAt: { gt: new Date() },
			},
			orderBy: { lastUsedAt: "desc" },
		})

		return sessions.map((session) => ({
			id: session.id,
			ip: session.ip ?? null,
			userAgent: session.userAgent ?? null,
			lastUsedAt: session.lastUsedAt,
			createdAt: session.createdAt,
			expiresAt: session.expiresAt,
		}))
	}

	async revokeSession(userId: string, accessId: string, sessionId: string) {
		const access = await this.prisma.sharedAccess.findUnique({
			where: { id: accessId },
		})

		if (!access) {
			throw new NotFoundException("Shared access not found")
		}

		if (access.userId !== userId) {
			throw new ForbiddenException("Access denied")
		}

		const session = await this.prisma.sharedAccessRefreshToken.findUnique({
			where: { id: sessionId },
		})
		if (!session || session.sharedAccessId !== accessId) {
			throw new NotFoundException("Session not found")
		}

		await this.prisma.sharedAccessRefreshToken.delete({
			where: { id: sessionId },
		})

		return { message: "Session revoked" }
	}

	async verifySharedAccess(
		request: FastifyRequest,
		reply: FastifyReply,
		token: string,
		password: string,
	) {
		const access = await this.prisma.sharedAccess.findUnique({
			where: { token },
		})

		if (!access) {
			throw new NotFoundException("Shared access not found")
		}

		if (!this.isAccessActive(access.status, access.expiresAt)) {
			throw new ForbiddenException("Access expired or revoked")
		}

		const passwordMatches = await compare(password, access.passwordHash)
		if (!passwordMatches) {
			const failedKey = `shared-access:failed:${access.id}`
			const failedAttempts = await this.incrementFailedAttempts(failedKey)
			if (failedAttempts >= 10) {
				await this.revokeSharedAccess(access.userId, access.id)
				throw new ForbiddenException("Access revoked")
			}
			throw new UnauthorizedException("Invalid password")
		}

		await this.clearFailedAttempts(`shared-access:failed:${access.id}`)

		await this.prisma.sharedAccess.update({
			where: { id: access.id },
			data: { lastAccessedAt: new Date() },
		})

		await this.prisma.sharedAccessLog.create({
			data: {
				sharedAccessId: access.id,
				ip: this.getRequestIp(request),
				userAgent: this.getUserAgent(request),
			},
		})

		await this.publishLoginEvent(access)

		return this.issueGuestTokens(
			request,
			reply,
			access.id,
			access.userId,
			access.expiresAt,
		)
	}

	async refreshSharedAccess(
		request: FastifyRequest,
		reply: FastifyReply,
		sharedAccessId: string,
		rawRefreshToken: string,
	) {
		const access = await this.prisma.sharedAccess.findUnique({
			where: { id: sharedAccessId },
		})

		if (!access) {
			throw new NotFoundException("Shared access not found")
		}

		if (!this.isAccessActive(access.status, access.expiresAt)) {
			throw new ForbiddenException("Access expired or revoked")
		}

		const refreshTokens =
			await this.prisma.sharedAccessRefreshToken.findMany({
				where: { sharedAccessId: access.id },
			})

		let matchedTokenId: string | null = null
		for (const tokenRecord of refreshTokens) {
			if (await compare(rawRefreshToken, tokenRecord.tokenHash)) {
				matchedTokenId = tokenRecord.id
				break
			}
		}

		if (!matchedTokenId) {
			throw new UnauthorizedException("Refresh token is not valid")
		}

		await this.prisma.sharedAccessRefreshToken.delete({
			where: { id: matchedTokenId },
		})

		return this.issueGuestTokens(
			request,
			reply,
			access.id,
			access.userId,
			access.expiresAt,
		)
	}

	async validateRefreshToken(
		sharedAccessId: string,
		rawRefreshToken: string,
	) {
		const access = await this.prisma.sharedAccess.findUnique({
			where: { id: sharedAccessId },
		})

		if (!access) {
			throw new NotFoundException("Shared access not found")
		}

		if (!this.isAccessActive(access.status, access.expiresAt)) {
			throw new ForbiddenException("Access expired or revoked")
		}

		const refreshTokens =
			await this.prisma.sharedAccessRefreshToken.findMany({
				where: { sharedAccessId: access.id },
			})

		for (const tokenRecord of refreshTokens) {
			if (await compare(rawRefreshToken, tokenRecord.tokenHash)) {
				return {
					sharedAccessId: access.id,
					ownerId: access.userId,
				}
			}
		}

		throw new UnauthorizedException("Refresh token is not valid")
	}

	private async issueGuestTokens(
		request: FastifyRequest,
		reply: FastifyReply,
		sharedAccessId: string,
		ownerId: string,
		expiresAt: Date,
	) {
		const accessTokenTtlMs = 5 * 60 * 1000
		const refreshTokenTtlMs = Math.min(
			24 * 60 * 60 * 1000,
			expiresAt.getTime() - Date.now(),
		)

		if (refreshTokenTtlMs <= 0) {
			throw new ForbiddenException("Access expired")
		}

		const accessToken = this.jwtService.sign(
			{
				sharedAccessId,
				ownerId,
				type: "shared-access",
			},
			{
				secret: this.envService.get("JWT_SHARED_ACCESS_SECRET"),
				expiresIn: Math.floor(accessTokenTtlMs / 1000),
			},
		)

		const refreshToken = this.jwtService.sign(
			{
				sharedAccessId,
				ownerId,
				type: "shared-access-refresh",
			},
			{
				secret: this.envService.get("JWT_SHARED_ACCESS_REFRESH_SECRET"),
				expiresIn: Math.floor(refreshTokenTtlMs / 1000),
			},
		)

		await this.prisma.sharedAccessRefreshToken.create({
			data: {
				sharedAccessId,
				tokenHash: await hash(refreshToken, 10),
				ip: this.getRequestIp(request),
				userAgent: this.getUserAgent(request),
				lastUsedAt: new Date(),
				expiresAt: new Date(Date.now() + refreshTokenTtlMs),
			},
		})

		await this.prisma.sharedAccess.update({
			where: { id: sharedAccessId },
			data: { lastAccessedAt: new Date() },
		})

		const isProduction = this.envService.get("NODE_ENV") === "prod"
		reply.setCookie("SharedAccessAuth", accessToken, {
			httpOnly: true,
			secure: isProduction,
			expires: new Date(Date.now() + accessTokenTtlMs),
			path: "/",
			sameSite: "lax",
		})

		reply.setCookie("SharedAccessRefresh", refreshToken, {
			httpOnly: true,
			secure: isProduction,
			expires: new Date(Date.now() + refreshTokenTtlMs),
			path: "/",
			sameSite: "lax",
		})

		return { success: true }
	}

	private resolvePublicStatus(
		status: string,
		expiresAt: Date,
	): "active" | "revoked" | "expired" {
		if (status === SHARED_ACCESS_STATUS.REVOKED) {
			return "revoked"
		}
		if (expiresAt.getTime() <= Date.now()) {
			return "expired"
		}
		return "active"
	}

	private isAccessActive(status: string, expiresAt: Date) {
		return (
			status === SHARED_ACCESS_STATUS.ACTIVE &&
			expiresAt.getTime() > Date.now()
		)
	}

	private mapSharedAccessResponse(
		access: {
			id: string
			name: string
			status: string
			token: string
			expiresAt: Date
			lastAccessedAt: Date | null
			createdAt: Date
		},
		activeSessionsCount: number,
	): SharedAccessResponseDto {
		return {
			id: access.id,
			name: access.name,
			status: access.status,
			token: access.token,
			expiresAt: access.expiresAt,
			lastAccessedAt: access.lastAccessedAt,
			createdAt: access.createdAt,
			shareUrl: `${this.envService.get("FRONTEND_URL")}/shared/${access.token}`,
			activeSessionsCount,
		}
	}

	private async publishLoginEvent(access: {
		id: string
		name: string
		userId: string
	}) {
		try {
			await this.sseService.publishRawEvent({
				recordId: "system",
				userId: access.userId,
				type: "shared-access:login",
				data: {
					accessId: access.id,
					accessName: access.name,
					timestamp: new Date().toISOString(),
				},
				timestamp: new Date().toISOString(),
			})
		} catch (error) {
			this.logger.error(
				"Failed to publish shared access login event",
				error,
			)
		}
	}

	async onModuleDestroy() {
		await this.redisClient.quit()
	}

	private async incrementFailedAttempts(key: string) {
		const result = await this.redisClient
			.multi()
			.incr(key)
			.expire(key, 3600)
			.exec()
		return Number(result?.[0]?.[1] ?? 0)
	}

	private async clearFailedAttempts(key: string) {
		await this.redisClient.del(key)
	}

	private getRequestIp(request: FastifyRequest) {
		const forwardedFor = request.headers["x-forwarded-for"]
		if (typeof forwardedFor === "string") {
			return forwardedFor.split(",")[0].trim()
		}
		return request.ip || null
	}

	private getUserAgent(request: FastifyRequest) {
		const userAgent = request.headers["user-agent"]
		return typeof userAgent === "string" ? userAgent : null
	}

	private generatePassword() {
		return randomBytes(6).toString("base64url")
	}

	private generateToken() {
		return randomBytes(16).toString("base64url")
	}
}
