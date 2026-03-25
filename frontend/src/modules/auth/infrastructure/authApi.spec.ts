import { describe, it, expect, vi, beforeEach } from "vitest"
import { login, register, getUser, logout } from "./authApi"

// Мокаем общий API-клиент
vi.mock("@/shared/api/api", () => ({
	client: {
		GET: vi.fn(),
		POST: vi.fn(),
	},
}))

import { client } from "@/shared/api/api"

describe("authApi", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe("login", () => {
		it("возвращает данные при успешном логине", async () => {
			const mockData = { user: { id: "u1" }, accessToken: "at" }
			vi.mocked(client.POST).mockResolvedValue({
				data: mockData,
				error: undefined,
				response: { ok: true },
			} as any)

			const result = await login({
				email: "test@example.com",
				password: "pw",
			})

			expect(client.POST).toHaveBeenCalledWith("/api/auth/login", {
				body: { email: "test@example.com", password: "pw" },
			})
			expect(result).toEqual(mockData)
		})

		it("выбрасывает ошибку при наличии error", async () => {
			vi.mocked(client.POST).mockResolvedValue({
				data: undefined,
				error: { message: "Invalid credentials" },
				response: { ok: false },
			} as any)

			await expect(
				login({ email: "test@example.com", password: "wrong" }),
			).rejects.toEqual({ message: "Invalid credentials" })
		})

		it("выбрасывает ошибку если data пустая", async () => {
			vi.mocked(client.POST).mockResolvedValue({
				data: undefined,
				error: undefined,
				response: { ok: true },
			} as any)

			await expect(
				login({ email: "test@example.com", password: "pw" }),
			).rejects.toThrow("Login failed - no data returned")
		})
	})

	describe("register", () => {
		it("возвращает данные при успешной регистрации", async () => {
			const mockData = { user: { id: "u2" }, accessToken: "at2" }
			vi.mocked(client.POST).mockResolvedValue({
				data: mockData,
				error: undefined,
			} as any)

			const result = await register({
				email: "new@example.com",
				password: "secret",
				name: "Иван",
			})

			expect(client.POST).toHaveBeenCalledWith(
				"/api/auth/register",
				{
					body: {
						email: "new@example.com",
						password: "secret",
						name: "Иван",
					},
				},
			)
			expect(result).toEqual(mockData)
		})

		it("выбрасывает ошибку при наличии error", async () => {
			vi.mocked(client.POST).mockResolvedValue({
				data: undefined,
				error: { message: "Email taken" },
			} as any)

			await expect(
				register({
					email: "taken@example.com",
					password: "pw",
					name: "A",
				}),
			).rejects.toEqual({ message: "Email taken" })
		})
	})

	describe("getUser", () => {
		it("возвращает данные пользователя", async () => {
			const mockData = {
				id: "u1",
				email: "test@example.com",
				name: "Иван",
			}
			vi.mocked(client.GET).mockResolvedValue({
				data: mockData,
				error: undefined,
				response: { ok: true },
			} as any)

			const result = await getUser()

			expect(client.GET).toHaveBeenCalledWith("/api/user")
			expect(result).toEqual(mockData)
		})

		it("выбрасывает ошибку если response не ok", async () => {
			vi.mocked(client.GET).mockResolvedValue({
				data: undefined,
				error: { message: "Unauthorized" },
				response: { ok: false },
			} as any)

			await expect(getUser()).rejects.toEqual({
				message: "Unauthorized",
			})
		})
	})

	describe("logout", () => {
		it("возвращает данные при успешном выходе", async () => {
			const mockData = { message: "Signed out" }
			vi.mocked(client.POST).mockResolvedValue({
				data: mockData,
				error: undefined,
			} as any)

			const result = await logout()

			expect(client.POST).toHaveBeenCalledWith("/api/auth/signout")
			expect(result).toEqual(mockData)
		})
	})
})
