import { ExecutionContext } from "@nestjs/common"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { mockAuthGuardCanActivate, authGuardFactory } = vi.hoisted(() => {
	const mockAuthGuardCanActivate = vi.fn()
	const authGuardFactory = vi.fn((strategy: string) => {
		return class {
			canActivate(context: ExecutionContext) {
				return mockAuthGuardCanActivate(context)
			}
		}
	})

	return {
		mockAuthGuardCanActivate,
		authGuardFactory,
	}
})

vi.mock("@nestjs/passport", () => ({
	AuthGuard: authGuardFactory,
}))

import { JwtRefreshAuthGuard } from "./jwt-refresh-auth.guard"

describe("JwtRefreshAuthGuard", () => {
	let guard: JwtRefreshAuthGuard
	let context: ExecutionContext

	beforeEach(() => {
		guard = new JwtRefreshAuthGuard()
		context = {
			switchToHttp: vi.fn(() => ({
				getRequest: vi.fn(() => ({})),
			})),
		} as unknown as ExecutionContext
		mockAuthGuardCanActivate.mockReset()
	})

	it("should create guard instance with canActivate method", () => {
		// Assert
		expect(guard).toBeInstanceOf(JwtRefreshAuthGuard)
		expect(typeof guard.canActivate).toBe("function")
	})

	it("should delegate canActivate to parent AuthGuard", () => {
		// Arrange
		mockAuthGuardCanActivate.mockReturnValue(true)

		// Act
		const result = guard.canActivate(context)

		// Assert
		expect(mockAuthGuardCanActivate).toHaveBeenCalledWith(context)
		expect(result).toBe(true)
	})

	it("should return false when parent AuthGuard denies access", () => {
		// Arrange
		mockAuthGuardCanActivate.mockReturnValue(false)

		// Act
		const result = guard.canActivate(context)

		// Assert
		expect(result).toBe(false)
	})
})
