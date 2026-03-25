import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { useUser, useLogin, useRegister, useLogout } from "./useAuth"

// Мокаем API функции
vi.mock("../infrastructure/authApi", () => ({
	getUser: vi.fn(),
	login: vi.fn(),
	register: vi.fn(),
	logout: vi.fn(),
}))

import { getUser, login, register, logout } from "../infrastructure/authApi"

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	})
	return ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>
			{children}
		</QueryClientProvider>
	)
}

describe("useAuth hooks", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	// =========================================================================
	// useUser
	// =========================================================================

	describe("useUser", () => {
		it("загружает данные пользователя", async () => {
			const userData = {
				id: "user-1",
				email: "test@test.com",
				name: "Test User",
			}
			vi.mocked(getUser).mockResolvedValue(userData as any)

			const { result } = renderHook(() => useUser(), {
				wrapper: createWrapper(),
			})

			await waitFor(() => expect(result.current.isSuccess).toBe(true))
			expect(result.current.data).toEqual(userData)
			expect(getUser).toHaveBeenCalledTimes(1)
		})

		it("не выполняет запрос при enabled = false", () => {
			const { result } = renderHook(() => useUser(false), {
				wrapper: createWrapper(),
			})

			expect(result.current.fetchStatus).toBe("idle")
			expect(getUser).not.toHaveBeenCalled()
		})

		it("обрабатывает ошибку", async () => {
			vi.mocked(getUser).mockRejectedValue(new Error("Unauthorized"))

			const { result } = renderHook(() => useUser(), {
				wrapper: createWrapper(),
			})

			await waitFor(() => expect(result.current.isError).toBe(true))
			expect(result.current.error?.message).toBe("Unauthorized")
		})
	})

	// =========================================================================
	// useLogin
	// =========================================================================

	describe("useLogin", () => {
		it("вызывает login с переданными данными", async () => {
			const loginData = { email: "test@test.com", password: "password" }
			const response = { accessToken: "token-123" }
			vi.mocked(login).mockResolvedValue(response as any)

			const { result } = renderHook(() => useLogin(), {
				wrapper: createWrapper(),
			})

			result.current.mutate(loginData)

			await waitFor(() => expect(result.current.isSuccess).toBe(true))
			expect(login).toHaveBeenCalledWith(loginData)
		})

		it("обрабатывает ошибку авторизации", async () => {
			vi.mocked(login).mockRejectedValue(new Error("Invalid credentials"))

			const { result } = renderHook(() => useLogin(), {
				wrapper: createWrapper(),
			})

			result.current.mutate({
				email: "wrong@test.com",
				password: "wrong",
			})

			await waitFor(() => expect(result.current.isError).toBe(true))
			expect(result.current.error?.message).toBe("Invalid credentials")
		})
	})

	// =========================================================================
	// useRegister
	// =========================================================================

	describe("useRegister", () => {
		it("вызывает register с переданными данными", async () => {
			const registerData = {
				email: "new@test.com",
				password: "password123",
				name: "New User",
			}
			vi.mocked(register).mockResolvedValue({} as any)

			const { result } = renderHook(() => useRegister(), {
				wrapper: createWrapper(),
			})

			result.current.mutate(registerData)

			await waitFor(() => expect(result.current.isSuccess).toBe(true))
			expect(register).toHaveBeenCalledWith(registerData)
		})
	})

	// =========================================================================
	// useLogout
	// =========================================================================

	describe("useLogout", () => {
		it("вызывает logout", async () => {
			vi.mocked(logout).mockResolvedValue(undefined as any)

			const { result } = renderHook(() => useLogout(), {
				wrapper: createWrapper(),
			})

			result.current.mutate()

			await waitFor(() => expect(result.current.isSuccess).toBe(true))
			expect(logout).toHaveBeenCalledTimes(1)
		})
	})
})
