import { Test, TestingModule } from "@nestjs/testing"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { UserController } from "./user.controller"
import { UserService } from "./user.service"

describe("UserController", () => {
	let controller: UserController
	let userService: {
		getUserById: ReturnType<typeof vi.fn>
	}

	beforeEach(async () => {
		userService = {
			getUserById: vi.fn(),
		}

		const module: TestingModule = await Test.createTestingModule({
			controllers: [UserController],
			providers: [
				{
					provide: UserService,
					useValue: userService,
				},
			],
		}).compile()

		controller = module.get<UserController>(UserController)
	})

	describe("getUser", () => {
		it("should return current user data from service", async () => {
			// Arrange
			const currentUser = {
				id: "user-1",
				email: "user@example.com",
				name: "User One",
				password: "$2b$10$hashed",
				role: "USER",
				createdAt: new Date("2026-01-01T00:00:00.000Z"),
				updatedAt: new Date("2026-01-01T00:00:00.000Z"),
			}
			const userResponse = {
				id: "user-1",
				email: "user@example.com",
				name: "User One",
				role: "USER",
				createdAt: new Date("2026-01-01T00:00:00.000Z"),
				updatedAt: new Date("2026-01-01T00:00:00.000Z"),
			}
			userService.getUserById.mockResolvedValue(userResponse)

			// Act
			const result = await controller.getUser(currentUser)

			// Assert
			expect(userService.getUserById).toHaveBeenCalledWith("user-1")
			expect(result).toEqual(userResponse)
		})
	})
})
