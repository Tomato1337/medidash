import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { JwtStrategy } from "./jwt.strategy"
import { ExtractJwt } from "passport-jwt"
import { FastifyRequest } from "fastify"
import { EnvService } from "src/env/env.service"
import { UserService } from "src/user/user.service"

describe("JwtStrategy", () => {
	type AuthRequest = Partial<FastifyRequest> & {
		headers?: {
			authorization?: string
		}
	}

	const extractorRef = {
		extractors: [] as Array<(request: AuthRequest) => string | null>,
	}

	beforeEach(() => {
		extractorRef.extractors = []
		vi.spyOn(ExtractJwt, "fromAuthHeaderAsBearerToken").mockReturnValue(
			(request: AuthRequest) => {
				const authHeader = request?.headers?.authorization
				if (!authHeader || typeof authHeader !== "string") {
					return null
				}

				const [scheme, token] = authHeader.split(" ")
				if (scheme !== "Bearer" || !token) {
					return null
				}

				return token
			},
		)
		vi.spyOn(ExtractJwt, "fromExtractors").mockImplementation((extractors) => {
			extractorRef.extractors = extractors as Array<
				(request: AuthRequest) => string | null
			>

			return (request: AuthRequest) => {
				for (const extractor of extractors as Array<
					(request: AuthRequest) => string | null
				>) {
					const token = extractor(request)
					if (token) {
						return token
					}
				}

				return null
			}
		})
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it("should return user from UserService on validate", async () => {
		// Arrange
		const configService = {
			get: vi.fn().mockReturnValue("jwt-secret"),
		}
		const user = {
			id: "user-1",
			email: "user@example.com",
			name: "Иван",
			role: "USER",
			createdAt: new Date("2026-01-01T00:00:00.000Z"),
			updatedAt: new Date("2026-01-02T00:00:00.000Z"),
		}
		const userService = {
			getUserById: vi.fn().mockResolvedValue(user),
		}
		const strategy = new JwtStrategy(
			configService as unknown as EnvService,
			userService as unknown as UserService,
		)

		// Act
		const result = await strategy.validate({ userId: "user-1" })

		// Assert
		expect(configService.get).toHaveBeenCalledWith("JWT_SECRET")
		expect(userService.getUserById).toHaveBeenCalledWith("user-1")
		expect(result).toEqual(user)
	})

	it("should configure extractor to read cookie first and then bearer header", () => {
		// Arrange
		const configService = {
			get: vi.fn().mockReturnValue("jwt-secret"),
		}
		const userService = {
			getUserById: vi.fn(),
		}
		new JwtStrategy(
			configService as unknown as EnvService,
			userService as unknown as UserService,
		)

		// Act
		const cookieRequest = {
			cookies: {
				Authentication: "cookie-access-token",
			},
			headers: {
				authorization: "Bearer header-access-token",
			},
		}
		const bearerRequest = {
			cookies: {},
			headers: {
				authorization: "Bearer header-access-token",
			},
		}

		const tokenFromCookie = extractorRef.extractors[0](cookieRequest)
		const tokenFromHeader = extractorRef.extractors[1](bearerRequest)

		// Assert
		expect(extractorRef.extractors).toHaveLength(2)
		expect(tokenFromCookie).toBe("cookie-access-token")
		expect(tokenFromHeader).toBe("header-access-token")
	})

	it("should return null from cookie extractor when cookie is missing", () => {
		// Arrange
		const configService = {
			get: vi.fn().mockReturnValue("jwt-secret"),
		}
		const userService = {
			getUserById: vi.fn(),
		}
		new JwtStrategy(
			configService as unknown as EnvService,
			userService as unknown as UserService,
		)

		// Act
		const token = extractorRef.extractors[0]({ cookies: {} })

		// Assert
		expect(token).toBeNull()
	})
})
