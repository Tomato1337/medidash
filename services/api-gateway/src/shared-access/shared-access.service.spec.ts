import { Test, TestingModule } from "@nestjs/testing"
import { describe, it, expect, beforeEach, vi } from "vitest"
import {
	NotFoundException,
	UnauthorizedException,
	ForbiddenException,
} from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import { SharedAccessService } from "./shared-access.service"
import { PrismaService } from "../prisma.service"
import { EnvService } from "../env/env.service"
import { SseService } from "../sse/sse.service"

// Мокаем bcryptjs
vi.mock("bcryptjs", () => ({
	compare: vi.fn(),
	hash: vi.fn().mockResolvedValue("hashed-value"),
}))
import { compare } from "bcryptjs"

// Мокаем crypto
vi.mock("crypto", () => ({
	randomBytes: vi.fn(() => ({
		toString: vi.fn().mockReturnValue("random-token-value"),
	})),
}))

// Мокаем ioredis
const redisInstance = {
	multi: vi.fn(),
	del: vi.fn().mockResolvedValue(1),
	quit: vi.fn().mockResolvedValue("OK"),
}
vi.mock("ioredis", () => ({
	default: vi.fn(function (this: any) {
		Object.assign(this, redisInstance)
	}),
}))

describe("SharedAccessService", () => {
	let service: SharedAccessService

	const mockPrisma = {
		user: { findUnique: vi.fn() },
		sharedAccess: {
			create: vi.fn(),
			findMany: vi.fn(),
			findUnique: vi.fn(),
			update: vi.fn(),
			updateMany: vi.fn(),
		},
		sharedAccessRefreshToken: {
			groupBy: vi.fn(),
			deleteMany: vi.fn(),
			findMany: vi.fn(),
			findUnique: vi.fn(),
			delete: vi.fn(),
			create: vi.fn(),
		},
		sharedAccessLog: {
			create: vi.fn(),
		},
	}

	const mockEnvService = {
		get: vi.fn((key: string) => {
			const map: Record<string, unknown> = {
				REDIS_HOST: "localhost",
				REDIS_PORT: 6379,
				JWT_SHARED_ACCESS_SECRET: "sa-secret",
				JWT_SHARED_ACCESS_REFRESH_SECRET: "sa-refresh-secret",
				FRONTEND_URL: "http://localhost:5173",
				NODE_ENV: "dev",
			}
			return map[key]
		}),
	}

	const mockJwtService = {
		sign: vi.fn().mockReturnValue("jwt-token"),
	}

	const mockSseService = {
		publishRawEvent: vi.fn().mockResolvedValue(undefined),
	}

	beforeEach(async () => {
		vi.clearAllMocks()

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				SharedAccessService,
				{ provide: PrismaService, useValue: mockPrisma },
				{ provide: EnvService, useValue: mockEnvService },
				{ provide: JwtService, useValue: mockJwtService },
				{ provide: SseService, useValue: mockSseService },
			],
		}).compile()

		service = module.get<SharedAccessService>(SharedAccessService)
	})

	describe("createSharedAccess", () => {
		it("создаёт доступ после проверки пароля", async () => {
			mockPrisma.user.findUnique.mockResolvedValue({
				id: "u1",
				password: "hashed-pw",
			})
			vi.mocked(compare).mockResolvedValue(true as never)
			const createdAccess = {
				id: "sa-1",
				name: "Для врача",
				status: "ACTIVE",
				token: "random-token-value",
				expiresAt: new Date(Date.now() + 86400000),
				lastAccessedAt: null,
				createdAt: new Date(),
			}
			mockPrisma.sharedAccess.create.mockResolvedValue(createdAccess)

			const result = await service.createSharedAccess("u1", {
				currentPassword: "password",
				name: "Для врача",
				durationDays: 1,
			})

			expect(result).toHaveProperty("generatedPassword")
			expect(result).toHaveProperty("id", "sa-1")
			expect(mockPrisma.sharedAccess.create).toHaveBeenCalled()
		})

		it("выбрасывает NotFoundException если пользователь не найден", async () => {
			mockPrisma.user.findUnique.mockResolvedValue(null)

			await expect(
				service.createSharedAccess("u-x", {
					currentPassword: "pw",
					name: "Test",
					durationDays: 1,
				}),
			).rejects.toThrow(NotFoundException)
		})

		it("выбрасывает UnauthorizedException при неверном пароле", async () => {
			mockPrisma.user.findUnique.mockResolvedValue({
				id: "u1",
				password: "hashed-pw",
			})
			vi.mocked(compare).mockResolvedValue(false as never)

			await expect(
				service.createSharedAccess("u1", {
					currentPassword: "wrong",
					name: "Test",
					durationDays: 1,
				}),
			).rejects.toThrow(UnauthorizedException)
		})
	})

	describe("listSharedAccesses", () => {
		it("возвращает пустой массив если нет доступов", async () => {
			mockPrisma.sharedAccess.findMany.mockResolvedValue([])

			const result = await service.listSharedAccesses("u1")

			expect(result).toEqual([])
		})

		it("возвращает доступы с подсчётом сессий", async () => {
			const accesses = [
				{
					id: "sa-1",
					name: "A",
					status: "ACTIVE",
					token: "t1",
					expiresAt: new Date(Date.now() + 86400000),
					lastAccessedAt: null,
					createdAt: new Date(),
					userId: "u1",
				},
			]
			mockPrisma.sharedAccess.findMany.mockResolvedValue(accesses)
			mockPrisma.sharedAccessRefreshToken.groupBy.mockResolvedValue([
				{ sharedAccessId: "sa-1", _count: { _all: 2 } },
			])

			const result = await service.listSharedAccesses("u1")

			expect(result).toHaveLength(1)
			expect(result[0]).toHaveProperty("activeSessionsCount", 2)
			expect(result[0]).toHaveProperty("shareUrl")
		})
	})

	describe("revokeSharedAccess", () => {
		it("отзывает доступ и удаляет токены", async () => {
			mockPrisma.sharedAccess.findUnique.mockResolvedValue({
				id: "sa-1",
				userId: "u1",
			})
			mockPrisma.sharedAccess.update.mockResolvedValue({})
			mockPrisma.sharedAccessRefreshToken.deleteMany.mockResolvedValue({
				count: 2,
			})

			const result = await service.revokeSharedAccess("u1", "sa-1")

			expect(result).toEqual({ message: "Access revoked" })
			expect(mockPrisma.sharedAccess.update).toHaveBeenCalledWith({
				where: { id: "sa-1" },
				data: { status: "REVOKED" },
			})
		})

		it("выбрасывает NotFoundException если доступ не найден", async () => {
			mockPrisma.sharedAccess.findUnique.mockResolvedValue(null)

			await expect(
				service.revokeSharedAccess("u1", "sa-x"),
			).rejects.toThrow(NotFoundException)
		})

		it("выбрасывает ForbiddenException если userId не совпадает", async () => {
			mockPrisma.sharedAccess.findUnique.mockResolvedValue({
				id: "sa-1",
				userId: "other-user",
			})

			await expect(
				service.revokeSharedAccess("u1", "sa-1"),
			).rejects.toThrow(ForbiddenException)
		})
	})

	describe("getSharedAccessInfo", () => {
		it("возвращает публичную информацию о доступе", async () => {
			mockPrisma.sharedAccess.findUnique.mockResolvedValue({
				id: "sa-1",
				status: "ACTIVE",
				expiresAt: new Date(Date.now() + 86400000),
				userId: "u1",
				user: { name: "Иван" },
			})

			const result = await service.getSharedAccessInfo("token-1")

			expect(result).toEqual({
				ownerName: "Иван",
				status: "active",
				ownerId: "u1",
			})
		})

		it("возвращает статус revoked", async () => {
			mockPrisma.sharedAccess.findUnique.mockResolvedValue({
				id: "sa-1",
				status: "REVOKED",
				expiresAt: new Date(Date.now() + 86400000),
				userId: "u1",
				user: { name: "Иван" },
			})

			const result = await service.getSharedAccessInfo("token-1")

			expect(result.status).toBe("revoked")
		})

		it("возвращает статус expired когда дата истекла", async () => {
			mockPrisma.sharedAccess.findUnique.mockResolvedValue({
				id: "sa-1",
				status: "ACTIVE",
				expiresAt: new Date(Date.now() - 1000),
				userId: "u1",
				user: { name: "Иван" },
			})

			const result = await service.getSharedAccessInfo("token-1")

			expect(result.status).toBe("expired")
		})

		it("выбрасывает NotFoundException если токен не найден", async () => {
			mockPrisma.sharedAccess.findUnique.mockResolvedValue(null)

			await expect(
				service.getSharedAccessInfo("bad-token"),
			).rejects.toThrow(NotFoundException)
		})
	})

	describe("listSessions", () => {
		it("возвращает список активных сессий", async () => {
			mockPrisma.sharedAccess.findUnique.mockResolvedValue({
				id: "sa-1",
				userId: "u1",
			})
			const sessions = [
				{
					id: "sess-1",
					ip: "1.2.3.4",
					userAgent: "Chrome",
					lastUsedAt: new Date(),
					createdAt: new Date(),
					expiresAt: new Date(Date.now() + 86400000),
				},
			]
			mockPrisma.sharedAccessRefreshToken.findMany.mockResolvedValue(
				sessions,
			)

			const result = await service.listSessions("u1", "sa-1")

			expect(result).toHaveLength(1)
			expect(result[0]).toHaveProperty("id", "sess-1")
		})

		it("выбрасывает ForbiddenException если userId не совпадает", async () => {
			mockPrisma.sharedAccess.findUnique.mockResolvedValue({
				id: "sa-1",
				userId: "other",
			})

			await expect(
				service.listSessions("u1", "sa-1"),
			).rejects.toThrow(ForbiddenException)
		})
	})

	describe("revokeSession", () => {
		it("удаляет конкретную сессию", async () => {
			mockPrisma.sharedAccess.findUnique.mockResolvedValue({
				id: "sa-1",
				userId: "u1",
			})
			mockPrisma.sharedAccessRefreshToken.findUnique.mockResolvedValue({
				id: "sess-1",
				sharedAccessId: "sa-1",
			})
			mockPrisma.sharedAccessRefreshToken.delete.mockResolvedValue({})

			const result = await service.revokeSession(
				"u1",
				"sa-1",
				"sess-1",
			)

			expect(result).toEqual({ message: "Session revoked" })
		})

		it("выбрасывает NotFoundException если сессия не найдена", async () => {
			mockPrisma.sharedAccess.findUnique.mockResolvedValue({
				id: "sa-1",
				userId: "u1",
			})
			mockPrisma.sharedAccessRefreshToken.findUnique.mockResolvedValue(
				null,
			)

			await expect(
				service.revokeSession("u1", "sa-1", "sess-x"),
			).rejects.toThrow(NotFoundException)
		})

		it("выбрасывает NotFoundException если сессия принадлежит другому доступу", async () => {
			mockPrisma.sharedAccess.findUnique.mockResolvedValue({
				id: "sa-1",
				userId: "u1",
			})
			mockPrisma.sharedAccessRefreshToken.findUnique.mockResolvedValue({
				id: "sess-1",
				sharedAccessId: "sa-other",
			})

			await expect(
				service.revokeSession("u1", "sa-1", "sess-1"),
			).rejects.toThrow(NotFoundException)
		})
	})

	describe("verifySharedAccess", () => {
		const mockRequest = {
			headers: { "user-agent": "TestBrowser" },
			ip: "1.2.3.4",
		} as any
		const mockReply = {
			setCookie: vi.fn(),
		} as any

		it("выбрасывает NotFoundException если доступ не найден", async () => {
			mockPrisma.sharedAccess.findUnique.mockResolvedValue(null)

			await expect(
				service.verifySharedAccess(
					mockRequest,
					mockReply,
					"bad-token",
					"pw",
				),
			).rejects.toThrow(NotFoundException)
		})

		it("выбрасывает ForbiddenException если доступ не активен", async () => {
			mockPrisma.sharedAccess.findUnique.mockResolvedValue({
				id: "sa-1",
				status: "REVOKED",
				expiresAt: new Date(Date.now() + 86400000),
				userId: "u1",
			})

			await expect(
				service.verifySharedAccess(
					mockRequest,
					mockReply,
					"token",
					"pw",
				),
			).rejects.toThrow(ForbiddenException)
		})

		it("выбрасывает UnauthorizedException при неверном пароле (< 10 попыток)", async () => {
			mockPrisma.sharedAccess.findUnique.mockResolvedValue({
				id: "sa-1",
				status: "ACTIVE",
				expiresAt: new Date(Date.now() + 86400000),
				userId: "u1",
				passwordHash: "hashed",
			})
			vi.mocked(compare).mockResolvedValue(false as never)
			redisInstance.multi.mockReturnValue({
				incr: vi.fn().mockReturnThis(),
				expire: vi.fn().mockReturnThis(),
				exec: vi.fn().mockResolvedValue([[null, 3]]),
			})

			await expect(
				service.verifySharedAccess(
					mockRequest,
					mockReply,
					"token",
					"wrong",
				),
			).rejects.toThrow(UnauthorizedException)
		})

		it("отзывает доступ после 10 неудачных попыток", async () => {
			mockPrisma.sharedAccess.findUnique.mockResolvedValue({
				id: "sa-1",
				status: "ACTIVE",
				expiresAt: new Date(Date.now() + 86400000),
				userId: "u1",
				passwordHash: "hashed",
			})
			vi.mocked(compare).mockResolvedValue(false as never)
			redisInstance.multi.mockReturnValue({
				incr: vi.fn().mockReturnThis(),
				expire: vi.fn().mockReturnThis(),
				exec: vi.fn().mockResolvedValue([[null, 10]]),
			})
			mockPrisma.sharedAccess.update.mockResolvedValue({})
			mockPrisma.sharedAccessRefreshToken.deleteMany.mockResolvedValue({
				count: 0,
			})

			await expect(
				service.verifySharedAccess(
					mockRequest,
					mockReply,
					"token",
					"wrong",
				),
			).rejects.toThrow(ForbiddenException)
		})

		it("выдаёт токены при верном пароле", async () => {
			mockPrisma.sharedAccess.findUnique.mockResolvedValue({
				id: "sa-1",
				status: "ACTIVE",
				expiresAt: new Date(Date.now() + 86400000),
				userId: "u1",
				name: "Доступ",
				passwordHash: "hashed",
			})
			vi.mocked(compare).mockResolvedValue(true as never)
			mockPrisma.sharedAccess.update.mockResolvedValue({})
			mockPrisma.sharedAccessLog.create.mockResolvedValue({})
			mockPrisma.sharedAccessRefreshToken.create.mockResolvedValue({})

			const result = await service.verifySharedAccess(
				mockRequest,
				mockReply,
				"token",
				"correct",
			)

			expect(result).toEqual({ success: true })
			expect(mockReply.setCookie).toHaveBeenCalledTimes(2)
			expect(mockJwtService.sign).toHaveBeenCalledTimes(2)
			expect(redisInstance.del).toHaveBeenCalled()
		})
	})

	describe("validateRefreshToken", () => {
		it("возвращает payload если refresh-токен совпадает", async () => {
			mockPrisma.sharedAccess.findUnique.mockResolvedValue({
				id: "sa-1",
				status: "ACTIVE",
				expiresAt: new Date(Date.now() + 86400000),
				userId: "u1",
			})
			mockPrisma.sharedAccessRefreshToken.findMany.mockResolvedValue([
				{ id: "rt-1", tokenHash: "hash-1" },
			])
			vi.mocked(compare).mockResolvedValue(true as never)

			const result = await service.validateRefreshToken(
				"sa-1",
				"raw-token",
			)

			expect(result).toEqual({
				sharedAccessId: "sa-1",
				ownerId: "u1",
			})
		})

		it("выбрасывает UnauthorizedException если ни один токен не совпал", async () => {
			mockPrisma.sharedAccess.findUnique.mockResolvedValue({
				id: "sa-1",
				status: "ACTIVE",
				expiresAt: new Date(Date.now() + 86400000),
				userId: "u1",
			})
			mockPrisma.sharedAccessRefreshToken.findMany.mockResolvedValue([
				{ id: "rt-1", tokenHash: "hash-1" },
			])
			vi.mocked(compare).mockResolvedValue(false as never)

			await expect(
				service.validateRefreshToken("sa-1", "bad-token"),
			).rejects.toThrow(UnauthorizedException)
		})

		it("выбрасывает NotFoundException если доступ не найден", async () => {
			mockPrisma.sharedAccess.findUnique.mockResolvedValue(null)

			await expect(
				service.validateRefreshToken("sa-x", "tok"),
			).rejects.toThrow(NotFoundException)
		})

		it("выбрасывает ForbiddenException если доступ не активен", async () => {
			mockPrisma.sharedAccess.findUnique.mockResolvedValue({
				id: "sa-1",
				status: "EXPIRED",
				expiresAt: new Date(Date.now() - 1000),
				userId: "u1",
			})

			await expect(
				service.validateRefreshToken("sa-1", "tok"),
			).rejects.toThrow(ForbiddenException)
		})
	})

	describe("onModuleDestroy", () => {
		it("закрывает Redis-соединение", async () => {
			await service.onModuleDestroy()

			expect(redisInstance.quit).toHaveBeenCalled()
		})
	})
})
