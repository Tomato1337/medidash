import { NotFoundException } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { PrismaService } from "src/prisma.service"
import { UserService } from "./user.service"

describe("UserService", () => {
	let service: UserService
	let prismaService: {
		user: {
			findUnique: ReturnType<typeof vi.fn>
			create: ReturnType<typeof vi.fn>
		}
	}

	beforeEach(async () => {
		prismaService = {
			user: {
				findUnique: vi.fn(),
				create: vi.fn(),
			},
		}

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				UserService,
				{
					provide: PrismaService,
					useValue: prismaService,
				},
			],
		}).compile()

		service = module.get<UserService>(UserService)
	})

	describe("getUserByEmail", () => {
		it("should return user when user exists", async () => {
			// Arrange
			const expectedUser = {
				id: "user-1",
				email: "user@example.com",
				name: "User One",
				password: "hashed-password",
				role: "USER",
				createdAt: new Date("2026-01-01T00:00:00.000Z"),
				updatedAt: new Date("2026-01-02T00:00:00.000Z"),
			}
			prismaService.user.findUnique.mockResolvedValue(expectedUser)

			// Act
			const result = await service.getUserByEmail("user@example.com")

			// Assert
			expect(prismaService.user.findUnique).toHaveBeenCalledWith({
				where: { email: "user@example.com" },
			})
			expect(result).toEqual(expectedUser)
		})

		it("should throw NotFoundException when user does not exist", async () => {
			// Arrange
			prismaService.user.findUnique.mockResolvedValue(null)

			// Act + Assert
			await expect(service.getUserByEmail("missing@example.com")).rejects.toThrow(
				NotFoundException,
			)
			await expect(service.getUserByEmail("missing@example.com")).rejects.toThrow(
				"User not found",
			)
		})
	})

	describe("getUserById", () => {
		it("should return selected user fields when user exists", async () => {
			// Arrange
			const expectedUser = {
				id: "user-1",
				email: "user@example.com",
				name: "User One",
				role: "USER",
				createdAt: new Date("2026-01-01T00:00:00.000Z"),
				updatedAt: new Date("2026-01-02T00:00:00.000Z"),
			}
			prismaService.user.findUnique.mockResolvedValue(expectedUser)

			// Act
			const result = await service.getUserById("user-1")

			// Assert
			expect(prismaService.user.findUnique).toHaveBeenCalledWith({
				where: { id: "user-1" },
				select: {
					id: true,
					email: true,
					name: true,
					role: true,
					createdAt: true,
					updatedAt: true,
				},
			})
			expect(result).toEqual(expectedUser)
		})

		it("should throw NotFoundException when user is not found", async () => {
			// Arrange
			prismaService.user.findUnique.mockResolvedValue(null)

			// Act + Assert
			await expect(service.getUserById("missing-id")).rejects.toThrow(
				NotFoundException,
			)
			await expect(service.getUserById("missing-id")).rejects.toThrow(
				"User not found",
			)
		})
	})

	describe("createUser", () => {
		it("should create user with hashed password", async () => {
			// Arrange
			const input = {
				email: "new@example.com",
				name: "New User",
				password: "$2b$10$hashed.password.value",
			}
			const createdUser = {
				id: "user-2",
				...input,
				role: "USER",
				createdAt: new Date("2026-01-03T00:00:00.000Z"),
				updatedAt: new Date("2026-01-03T00:00:00.000Z"),
			}
			prismaService.user.create.mockResolvedValue(createdUser)

			// Act
			const result = await service.createUser(input)

			// Assert
			expect(prismaService.user.create).toHaveBeenCalledWith({
				data: {
					email: "new@example.com",
					name: "New User",
					password: "$2b$10$hashed.password.value",
				},
			})
			expect(result).toEqual(createdUser)
		})
	})
})
