// auth.store.ts
import type { DTO } from "@/shared/api/api"
import { create } from "zustand"
import { persist } from "zustand/middleware"

interface AuthStore {
	user: DTO["UserResponseDto"] | null
	isAuthenticated: boolean

	setAuth: (user: DTO["UserResponseDto"], accessToken: string) => void
	logout: () => void
	getAccessToken: () => string | null
}

export const useAuthStore = create<AuthStore>()(
	persist(
		(set, get) => ({
			user: null,
			isAuthenticated: false,

			setAuth: (user, accessToken) => {
				localStorage.setItem("accessToken", accessToken)
				set({ user, isAuthenticated: true })
			},

			logout: () => {
				localStorage.removeItem("accessToken")
				localStorage.removeItem("refreshToken")
				set({ user: null, isAuthenticated: false })
			},

			getAccessToken: () => localStorage.getItem("accessToken"),
		}),
		{
			name: "auth-storage",
			partialize: (state) => ({
				user: state.user,
				isAuthenticated: state.isAuthenticated,
			}),
		},
	),
)
