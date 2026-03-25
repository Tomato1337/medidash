import { Test, TestingModule } from "@nestjs/testing"
import { describe, it, expect, beforeEach, vi } from "vitest"
import { AuthController } from "./auth.controller"
import { AuthService } from "./auth.service"

describe("AuthController", () => {
	let controller: AuthController

	const mockAuthService = {
		register: vi.fn(),
		login: vi.fn(),
		signOut: vi.fn(),
	}

	const mockUser = {
		id: "user-1",
		email: "user@example.com",
		name: "Иван",
		role: "USER",
		password: "hashed",
		createdAt: new Date(),
		updatedAt: new Date(),
	}

	const mockReply = {
		setCookie: vi.fn(),
		clearCookie: vi.fn(),
	}

	const mockRequest = {
		cookies: { RefreshToken: "refresh-token" },
	}

	beforeEach(async () => {
		vi.clearAllMocks()

		const module: TestingModule = await Test.createTestingModule({
			controllers: [AuthController],
			providers: [
				{ provide: AuthService, useValue: mockAuthService },
			],
		}).compile()

		controller = module.get<AuthController>(AuthController)
	})

	it("delegates register to AuthService", async () => {
		const dto = {
			email: "new@example.com",
			password: "secret123",
			name: "Новый",
		}
		const expected = { user: { id: "user-2" }, accessToken: "at" }
		mockAuthService.register.mockResolvedValue(expected)

		const result = await controller.register(dto as any, mockReply as any)

		expect(mockAuthService.register).toHaveBeenCalledWith(dto, mockReply)
		expect(result).toEqual(expected)
	})

	it("delegates login to AuthService with user from guard", async () => {
		const expected = { user: { id: "user-1" }, accessToken: "at" }
		mockAuthService.login.mockResolvedValue(expected)

		const result = await controller.login(
			mockUser as any,
			mockReply as any,
		)

		expect(mockAuthService.login).toHaveBeenCalledWith(mockUser, mockReply)
		expect(result).toEqual(expected)
	})

	it("delegates refresh to AuthService.login", async () => {
		const expected = { user: { id: "user-1" }, accessToken: "new-at" }
		mockAuthService.login.mockResolvedValue(expected)

		const result = await controller.refresh(
			mockUser as any,
			mockReply as any,
		)

		expect(mockAuthService.login).toHaveBeenCalledWith(mockUser, mockReply)
		expect(result).toEqual(expected)
	})

	it("delegates signOut to AuthService", async () => {
		const expected = { message: "Signed out" }
		mockAuthService.signOut.mockResolvedValue(expected)

		const result = await controller.signOut(
			mockUser as any,
			mockReply as any,
			mockRequest as any,
		)

		expect(mockAuthService.signOut).toHaveBeenCalledWith(
			"user-1",
			mockReply,
			mockRequest,
		)
		expect(result).toEqual(expected)
	})

	it("delegates signOutAllDevices with allDevices=true", async () => {
		const expected = { message: "Signed out from all devices" }
		mockAuthService.signOut.mockResolvedValue(expected)

		const result = await controller.signOutAllDevices(
			mockUser as any,
			mockReply as any,
			mockRequest as any,
		)

		expect(mockAuthService.signOut).toHaveBeenCalledWith(
			"user-1",
			mockReply,
			mockRequest,
			true,
		)
		expect(result).toEqual(expected)
	})
})
