import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { JwtRefreshStrategy } from "./jwt-refresh.strategy"
import { ExtractJwt } from "passport-jwt"
import { FastifyRequest } from "fastify"
import { EnvService } from "src/env/env.service"
import { AuthService } from "../auth.service"

describe("JwtRefreshStrategy", () => {
	type RefreshRequest = Pick<FastifyRequest, "cookies">

	const extractorRef = {
		extractors: [] as Array<(request: RefreshRequest) => string | null>,
	}

	beforeEach(() => {
		extractorRef.extractors = []
		vi.spyOn(ExtractJwt, "fromExtractors").mockImplementation((extractors) => {
			extractorRef.extractors = extractors as Array<
				(request: RefreshRequest) => string | null
			>

			return (request: RefreshRequest) => {
				for (const extractor of extractors as Array<
					(request: RefreshRequest) => string | null
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

	it("should return user from AuthService when refresh token is valid", async () => {
		// Arrange
		const configService = {
			get: vi.fn().mockReturnValue("refresh-secret"),
		}
		const user = {
			id: "user-1",
			email: "user@example.com",
			name: "Иван",
			role: "USER",
			createdAt: new Date("2026-01-01T00:00:00.000Z"),
			updatedAt: new Date("2026-01-02T00:00:00.000Z"),
		}
		const authService = {
			verifyUserRefreshToken: vi.fn().mockResolvedValue(user),
		}
		const strategy = new JwtRefreshStrategy(
			configService as unknown as EnvService,
			authService as unknown as AuthService,
		)
		const request = {
			cookies: {
				Refresh: "refresh-token",
			},
		} as FastifyRequest

		// Act
		const result = await strategy.validate(request, { userId: "user-1" })

		// Assert
		expect(configService.get).toHaveBeenCalledWith("JWT_REFRESH_SECRET")
		expect(authService.verifyUserRefreshToken).toHaveBeenCalledWith(
			"refresh-token",
			"user-1",
		)
		expect(result).toEqual(user)
	})

	it("should throw when refresh cookie is missing", async () => {
		// Arrange
		const configService = {
			get: vi.fn().mockReturnValue("refresh-secret"),
		}
		const authService = {
			verifyUserRefreshToken: vi.fn(),
		}
		const strategy = new JwtRefreshStrategy(
			configService as unknown as EnvService,
			authService as unknown as AuthService,
		)
		const request = { cookies: {} } as FastifyRequest

		// Act + Assert
		await expect(strategy.validate(request, { userId: "user-1" })).rejects.toThrow(
			new Error("Refresh token not found"),
		)
		expect(authService.verifyUserRefreshToken).not.toHaveBeenCalled()
	})

	it("should configure extractor to read refresh token from cookie", () => {
		// Arrange
		const configService = {
			get: vi.fn().mockReturnValue("refresh-secret"),
		}
		const authService = {
			verifyUserRefreshToken: vi.fn(),
		}
		new JwtRefreshStrategy(
			configService as unknown as EnvService,
			authService as unknown as AuthService,
		)

		// Act
		const token = extractorRef.extractors[0]({
			cookies: {
				Refresh: "cookie-refresh-token",
			},
		})

		// Assert
		expect(extractorRef.extractors).toHaveLength(1)
		expect(token).toBe("cookie-refresh-token")
	})

	it("should return null when refresh cookie is absent in extractor", () => {
		// Arrange
		const configService = {
			get: vi.fn().mockReturnValue("refresh-secret"),
		}
		const authService = {
			verifyUserRefreshToken: vi.fn(),
		}
		new JwtRefreshStrategy(
			configService as unknown as EnvService,
			authService as unknown as AuthService,
		)

		// Act
		const token = extractorRef.extractors[0]({ cookies: {} })

		// Assert
		expect(token).toBeNull()
	})
})
