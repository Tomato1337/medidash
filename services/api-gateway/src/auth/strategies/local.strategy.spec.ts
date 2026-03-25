import { UnauthorizedException } from "@nestjs/common"
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { LocalStrategy } from "./local.strategy"
import { AuthService } from "../auth.service"

describe("LocalStrategy", () => {
	let authService: {
		verifyUser: ReturnType<typeof vi.fn>
	}
	let strategy: LocalStrategy

	beforeEach(() => {
		authService = {
			verifyUser: vi.fn(),
		}

		strategy = new LocalStrategy(authService as unknown as AuthService)
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	it("should call AuthService.verifyUser with email and password", async () => {
		// Arrange
		const user = {
			id: "user-1",
			email: "user@example.com",
			name: "Иван",
			role: "USER",
			createdAt: new Date("2026-01-01T00:00:00.000Z"),
			updatedAt: new Date("2026-01-02T00:00:00.000Z"),
		}
		authService.verifyUser.mockResolvedValue(user)

		// Act
		const result = await strategy.validate("user@example.com", "StrongPass123")

		// Assert
		expect(authService.verifyUser).toHaveBeenCalledWith(
			"user@example.com",
			"StrongPass123",
		)
		expect(result).toEqual(user)
	})

	it("should propagate UnauthorizedException from AuthService", async () => {
		// Arrange
		authService.verifyUser.mockRejectedValue(
			new UnauthorizedException("Credentials are not valid"),
		)

		// Act + Assert
		await expect(
			strategy.validate("user@example.com", "wrong-password"),
		).rejects.toThrow(new UnauthorizedException("Credentials are not valid"))
	})
})
