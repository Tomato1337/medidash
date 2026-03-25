import { Reflector } from "@nestjs/core"
import { ExecutionContext } from "@nestjs/common"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockAuthGuardCanActivate = vi.fn()

vi.mock("@nestjs/passport", () => ({
	AuthGuard: () => {
		return class {
			canActivate(context: ExecutionContext) {
				return mockAuthGuardCanActivate(context)
			}
		}
	},
}))

import { JwtAuthGuard } from "./jwt-auth.guard"
import { IS_PUBLIC_KEY } from "../decorators/public.decorator"

describe("JwtAuthGuard", () => {
	let guard: JwtAuthGuard
	let reflector: {
		getAllAndOverride: ReturnType<typeof vi.fn>
	}
	let context: ExecutionContext
	const handler = vi.fn()
	const classRef = class TestController {}

	beforeEach(() => {
		reflector = {
			getAllAndOverride: vi.fn(),
		}
		guard = new JwtAuthGuard(reflector as unknown as Reflector)
		context = {
			getHandler: vi.fn(() => handler),
			getClass: vi.fn(() => classRef),
		} as unknown as ExecutionContext
		mockAuthGuardCanActivate.mockReset()
	})

	describe("canActivate", () => {
		it("should allow access for public route", () => {
			// Arrange
			reflector.getAllAndOverride.mockReturnValue(true)

			// Act
			const result = guard.canActivate(context)

			// Assert
			expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
				handler,
				classRef,
			])
			expect(mockAuthGuardCanActivate).not.toHaveBeenCalled()
			expect(result).toBe(true)
		})

		it("should enforce auth for protected route via parent AuthGuard", () => {
			// Arrange
			reflector.getAllAndOverride.mockReturnValue(false)
			mockAuthGuardCanActivate.mockReturnValue(true)

			// Act
			const result = guard.canActivate(context)

			// Assert
			expect(mockAuthGuardCanActivate).toHaveBeenCalledWith(context)
			expect(result).toBe(true)
		})

		it("should propagate parent guard rejection for protected route", () => {
			// Arrange
			reflector.getAllAndOverride.mockReturnValue(false)
			mockAuthGuardCanActivate.mockReturnValue(false)

			// Act
			const result = guard.canActivate(context)

			// Assert
			expect(mockAuthGuardCanActivate).toHaveBeenCalledWith(context)
			expect(result).toBe(false)
		})
	})
})
