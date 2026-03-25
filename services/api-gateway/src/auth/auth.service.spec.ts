import { Test, TestingModule } from "@nestjs/testing"
import { UnauthorizedException } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { AuthService } from "./auth.service"
import { UserService } from "src/user/user.service"
import { EnvService } from "src/env/env.service"
import { PrismaService } from "src/prisma.service"
import { FastifyReply, FastifyRequest } from "fastify"
import { User } from "generated/prisma"
import { hash, compare } from "bcryptjs"

vi.mock("bcryptjs", () => ({
	hash: vi.fn(),
	compare: vi.fn(),
}))

const hashMock = vi.mocked(hash)
const compareMock = vi.mocked(compare)

describe("AuthService", () => {
	let service: AuthService
	let userService: {
		getUserByEmail: ReturnType<typeof vi.fn>
		getUserById: ReturnType<typeof vi.fn>
	}
	let jwtService: {
		sign: ReturnType<typeof vi.fn>
	}
	let envService: {
		get: ReturnType<typeof vi.fn>
	}
	let prisma: {
		refreshToken: {
			create: ReturnType<typeof vi.fn>
			findMany: ReturnType<typeof vi.fn>
			delete: ReturnType<typeof vi.fn>
			deleteMany: ReturnType<typeof vi.fn>
		}
		user: {
			findUnique: ReturnType<typeof vi.fn>
			create: ReturnType<typeof vi.fn>
		}
	}

	type ReplyMock = Pick<FastifyReply, "setCookie" | "clearCookie">
	type RequestMock = Pick<FastifyRequest, "cookies">

	const createUserEntity = (): User => ({
		id: "user-1",
		email: "user@example.com",
		name: "Иван",
		role: "USER",
		password: "hashed-password",
		createdAt: new Date("2026-01-01T00:00:00.000Z"),
		updatedAt: new Date("2026-01-02T00:00:00.000Z"),
	})

	const createReply = (): ReplyMock => ({
		setCookie: vi.fn(),
		clearCookie: vi.fn(),
	})

	beforeEach(async () => {
		userService = {
			getUserByEmail: vi.fn(),
			getUserById: vi.fn(),
		}

		jwtService = {
			sign: vi.fn(),
		}

		envService = {
			get: vi.fn((key: string) => {
				const values: Record<string, string> = {
					JWT_EXPIRES_IN: "15m",
					JWT_REFRESH_EXPIRES_IN: "7d",
					JWT_SECRET: "access-secret",
					JWT_REFRESH_SECRET: "refresh-secret",
					NODE_ENV: "test",
				}

				return values[key]
			}),
		}

		prisma = {
			refreshToken: {
				create: vi.fn(),
				findMany: vi.fn(),
				delete: vi.fn(),
				deleteMany: vi.fn(),
			},
			user: {
				findUnique: vi.fn(),
				create: vi.fn(),
			},
		}

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				AuthService,
				{
					provide: UserService,
					useValue: userService,
				},
				{
					provide: JwtService,
					useValue: jwtService,
				},
				{
					provide: EnvService,
					useValue: envService,
				},
				{
					provide: PrismaService,
					useValue: prisma,
				},
			],
		}).compile()

		service = module.get<AuthService>(AuthService)

		jwtService.sign
			.mockReturnValueOnce("access-token")
			.mockReturnValueOnce("refresh-token")
		hashMock.mockResolvedValue("hashed-refresh-token")
		compareMock.mockResolvedValue(true)
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe("register", () => {
		it("should register user, hash password and login", async () => {
			// Arrange
			const reply = createReply() as FastifyReply
			const dto = {
				email: "new@example.com",
				name: "Новый пользователь",
				password: "StrongPass123",
			}
			const createdUser = {
				...createUserEntity(),
				email: dto.email,
				name: dto.name,
			}
			const loginResult = {
				user: {
					id: createdUser.id,
					email: createdUser.email,
					name: createdUser.name,
					role: createdUser.role,
					createdAt: createdUser.createdAt,
					updatedAt: createdUser.updatedAt,
				},
				accessToken: "access-token",
			}

			prisma.user.findUnique.mockResolvedValue(null)
			hashMock.mockResolvedValue("hashed-user-password")
			prisma.user.create.mockResolvedValue(createdUser)
			vi.spyOn(service, "login").mockResolvedValue(loginResult)

			// Act
			const result = await service.register(dto, reply)

			// Assert
			expect(prisma.user.findUnique).toHaveBeenCalledWith({
				where: { email: dto.email },
			})
			expect(hashMock).toHaveBeenCalledWith(dto.password, 10)
			expect(prisma.user.create).toHaveBeenCalledWith({
				data: {
					email: dto.email,
					name: dto.name,
					password: "hashed-user-password",
				},
			})
			expect(service.login).toHaveBeenCalledWith(createdUser, reply)
			expect(result).toEqual(loginResult)
		})

		it("should throw when email already exists", async () => {
			// Arrange
			const reply = createReply() as FastifyReply
			const dto = {
				email: "existing@example.com",
				name: "Иван",
				password: "StrongPass123",
			}
			prisma.user.findUnique.mockResolvedValue(createUserEntity())

			// Act + Assert
			await expect(service.register(dto, reply)).rejects.toThrow(
				new UnauthorizedException("Пользователь с таким email уже существует"),
			)
			expect(prisma.user.create).not.toHaveBeenCalled()
		})

		it("should throw generic unauthorized when unknown error occurs", async () => {
			// Arrange
			const reply = createReply() as FastifyReply
			const dto = {
				email: "new@example.com",
				name: "Иван",
				password: "StrongPass123",
			}
			prisma.user.findUnique.mockResolvedValue(null)
			hashMock.mockResolvedValue("hashed-user-password")
			prisma.user.create.mockRejectedValue(new Error("DB down"))

			// Act + Assert
			await expect(service.register(dto, reply)).rejects.toThrow(
				new UnauthorizedException(
					"Не удалось зарегистрировать пользователя. Попробуйте снова.",
				),
			)
		})
	})

	describe("login", () => {
		it("should return access token, user data and set auth cookies", async () => {
			// Arrange
			const user = createUserEntity()
			const reply = createReply() as FastifyReply
			prisma.refreshToken.create.mockResolvedValue({ id: "token-1" })

			// Act
			const result = await service.login(user, reply)

			// Assert
			expect(jwtService.sign).toHaveBeenNthCalledWith(
				1,
				{ userId: user.id },
				{
					secret: "access-secret",
					expiresIn: 15 * 60 * 1000,
				},
			)
			expect(jwtService.sign).toHaveBeenNthCalledWith(
				2,
				{ userId: user.id },
				{
					secret: "refresh-secret",
					expiresIn: 7 * 24 * 60 * 60 * 1000,
				},
			)
			expect(hashMock).toHaveBeenCalledWith("refresh-token", 10)
			expect(prisma.refreshToken.create).toHaveBeenCalledWith({
				data: {
					token: "hashed-refresh-token",
					userId: user.id,
					expiresAt: expect.any(Date),
				},
			})
			expect(reply.setCookie).toHaveBeenCalledTimes(2)
			expect(reply.setCookie).toHaveBeenNthCalledWith(
				1,
				"Authentication",
				"access-token",
				{
					httpOnly: true,
					secure: false,
					expires: expect.any(Date),
					path: "/",
					sameSite: "lax",
				},
			)
			expect(reply.setCookie).toHaveBeenNthCalledWith(
				2,
				"Refresh",
				"refresh-token",
				{
					httpOnly: true,
					secure: false,
					expires: expect.any(Date),
					path: "/",
					sameSite: "lax",
				},
			)
			expect(result).toEqual({
				user: {
					id: user.id,
					email: user.email,
					name: user.name,
					role: user.role,
					createdAt: user.createdAt,
					updatedAt: user.updatedAt,
				},
				accessToken: "access-token",
			})
		})

		it("should set secure cookies in prod env", async () => {
			// Arrange
			const user = createUserEntity()
			const reply = createReply() as FastifyReply
			envService.get.mockImplementation((key: string) => {
				if (key === "NODE_ENV") {
					return "prod"
				}

				const values: Record<string, string> = {
					JWT_EXPIRES_IN: "15m",
					JWT_REFRESH_EXPIRES_IN: "7d",
					JWT_SECRET: "access-secret",
					JWT_REFRESH_SECRET: "refresh-secret",
				}

				return values[key]
			})
			prisma.refreshToken.create.mockResolvedValue({ id: "token-1" })

			// Act
			await service.login(user, reply)

			// Assert
			expect(reply.setCookie).toHaveBeenNthCalledWith(
				1,
				"Authentication",
				"access-token",
				expect.objectContaining({ secure: true }),
			)
			expect(reply.setCookie).toHaveBeenNthCalledWith(
				2,
				"Refresh",
				"refresh-token",
				expect.objectContaining({ secure: true }),
			)
		})

		it("should throw unauthorized when login processing fails", async () => {
			// Arrange
			const user = createUserEntity()
			const reply = createReply() as FastifyReply
			envService.get.mockImplementation((key: string) => {
				if (key === "JWT_EXPIRES_IN") {
					return "bad-value"
				}

				const values: Record<string, string> = {
					JWT_REFRESH_EXPIRES_IN: "7d",
					JWT_SECRET: "access-secret",
					JWT_REFRESH_SECRET: "refresh-secret",
					NODE_ENV: "test",
				}

				return values[key]
			})

			// Act + Assert
			await expect(service.login(user, reply)).rejects.toThrow(
				new UnauthorizedException(
					"Failed to process login. Please try again.",
				),
			)
			expect(reply.setCookie).not.toHaveBeenCalled()
		})
	})

	describe("verifyUser", () => {
		it("should return user when credentials are valid", async () => {
			// Arrange
			const user = createUserEntity()
			userService.getUserByEmail.mockResolvedValue(user)
			compareMock.mockResolvedValue(true)

			// Act
			const result = await service.verifyUser("user@example.com", "password")

			// Assert
			expect(userService.getUserByEmail).toHaveBeenCalledWith("user@example.com")
			expect(compareMock).toHaveBeenCalledWith("password", user.password)
			expect(result).toEqual(user)
		})

		it("should throw unauthorized when password is invalid", async () => {
			// Arrange
			const user = createUserEntity()
			userService.getUserByEmail.mockResolvedValue(user)
			compareMock.mockResolvedValue(false)

			// Act + Assert
			await expect(
				service.verifyUser("user@example.com", "wrong-password"),
			).rejects.toThrow(
				new UnauthorizedException("Credentials are not valid"),
			)
		})

		it("should throw unauthorized when user is not found", async () => {
			// Arrange
			userService.getUserByEmail.mockRejectedValue(new Error("User not found"))

			// Act + Assert
			await expect(
				service.verifyUser("missing@example.com", "password"),
			).rejects.toThrow(
				new UnauthorizedException("Credentials are not valid"),
			)
		})
	})

	describe("verifyUserRefreshToken", () => {
		it("should return user when refresh token matches", async () => {
			// Arrange
			const userResponse = {
				id: "user-1",
				email: "user@example.com",
				name: "Иван",
				role: "USER",
				createdAt: new Date("2026-01-01T00:00:00.000Z"),
				updatedAt: new Date("2026-01-02T00:00:00.000Z"),
			}
			userService.getUserById.mockResolvedValue(userResponse)
			prisma.refreshToken.findMany.mockResolvedValue([
				{ id: "token-1", token: "hash-1" },
				{ id: "token-2", token: "hash-2" },
			])
			compareMock
				.mockResolvedValueOnce(false)
				.mockResolvedValueOnce(true)

			// Act
			const result = await service.verifyUserRefreshToken(
				"plain-refresh-token",
				"user-1",
			)

			// Assert
			expect(userService.getUserById).toHaveBeenCalledWith("user-1")
			expect(prisma.refreshToken.findMany).toHaveBeenCalledWith({
				where: {
					userId: "user-1",
					expiresAt: {
						gt: expect.any(Date),
					},
				},
			})
			expect(result).toEqual(userResponse)
		})

		it("should throw unauthorized when no token matches", async () => {
			// Arrange
			const userResponse = {
				id: "user-1",
				email: "user@example.com",
				name: "Иван",
				role: "USER",
				createdAt: new Date("2026-01-01T00:00:00.000Z"),
				updatedAt: new Date("2026-01-02T00:00:00.000Z"),
			}
			userService.getUserById.mockResolvedValue(userResponse)
			prisma.refreshToken.findMany.mockResolvedValue([{ token: "hash-1" }])
			compareMock.mockResolvedValue(false)

			// Act + Assert
			await expect(
				service.verifyUserRefreshToken("plain-refresh-token", "user-1"),
			).rejects.toThrow(
				new UnauthorizedException("Refresh token is not valid"),
			)
		})

		it("should throw unauthorized when token store lookup fails", async () => {
			// Arrange
			const userResponse = {
				id: "user-1",
				email: "user@example.com",
				name: "Иван",
				role: "USER",
				createdAt: new Date("2026-01-01T00:00:00.000Z"),
				updatedAt: new Date("2026-01-02T00:00:00.000Z"),
			}
			userService.getUserById.mockResolvedValue(userResponse)
			prisma.refreshToken.findMany.mockRejectedValue(new Error("DB down"))

			// Act + Assert
			await expect(
				service.verifyUserRefreshToken("plain-refresh-token", "user-1"),
			).rejects.toThrow(
				new UnauthorizedException("Refresh token is not valid"),
			)
		})
	})

	describe("signOut", () => {
		it("should sign out all devices and clear cookies", async () => {
			// Arrange
			const reply = createReply() as FastifyReply
			const request: RequestMock = { cookies: {} }
			prisma.refreshToken.deleteMany.mockResolvedValue({ count: 2 })

			// Act
			const result = await service.signOut("user-1", reply, request, true)

			// Assert
			expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
				where: { userId: "user-1" },
			})
			expect(reply.clearCookie).toHaveBeenCalledWith("Authentication")
			expect(reply.clearCookie).toHaveBeenCalledWith("Refresh")
			expect(result).toEqual({ message: "Successfully signed out" })
		})

		it("should delete only current refresh token when cookie exists", async () => {
			// Arrange
			const reply = createReply() as FastifyReply
			const request = {
				cookies: {
					Refresh: "current-refresh-token",
				},
			} as RequestMock
			prisma.refreshToken.findMany.mockResolvedValue([
				{ id: "token-1", token: "hash-1" },
				{ id: "token-2", token: "hash-2" },
			])
			compareMock
				.mockResolvedValueOnce(false)
				.mockResolvedValueOnce(true)
			prisma.refreshToken.delete.mockResolvedValue({ id: "token-2" })

			// Act
			const result = await service.signOut("user-1", reply, request)

			// Assert
			expect(prisma.refreshToken.findMany).toHaveBeenCalledWith({
				where: { userId: "user-1" },
			})
			expect(prisma.refreshToken.delete).toHaveBeenCalledWith({
				where: { id: "token-2" },
			})
			expect(prisma.refreshToken.deleteMany).not.toHaveBeenCalled()
			expect(reply.clearCookie).toHaveBeenCalledWith("Authentication")
			expect(reply.clearCookie).toHaveBeenCalledWith("Refresh")
			expect(result).toEqual({ message: "Successfully signed out" })
		})

		it("should clear cookies even when refresh cookie is absent", async () => {
			// Arrange
			const reply = createReply() as FastifyReply
			const request: RequestMock = { cookies: {} }

			// Act
			const result = await service.signOut("user-1", reply, request)

			// Assert
			expect(prisma.refreshToken.findMany).not.toHaveBeenCalled()
			expect(prisma.refreshToken.delete).not.toHaveBeenCalled()
			expect(reply.clearCookie).toHaveBeenCalledWith("Authentication")
			expect(reply.clearCookie).toHaveBeenCalledWith("Refresh")
			expect(result).toEqual({ message: "Successfully signed out" })
		})

		it("should throw unauthorized when sign out fails", async () => {
			// Arrange
			const reply = createReply() as FastifyReply
			const request: RequestMock = { cookies: {} }
			prisma.refreshToken.deleteMany.mockRejectedValue(new Error("DB down"))

			// Act + Assert
			await expect(
				service.signOut("user-1", reply, request, true),
			).rejects.toThrow(new UnauthorizedException("Failed to process sign out"))
		})
	})
})
