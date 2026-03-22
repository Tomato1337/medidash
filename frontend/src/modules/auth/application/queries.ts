import { queryOptions, mutationOptions } from "@tanstack/react-query"
import { queryKeys, mutationKeys } from "@/shared/api/queries"
import { login, register, getUser, logout } from "../infrastructure/authApi"
import type { LoginInput, RegisterInput } from "../domain/types"

// =============================================================================
// USER QUERY OPTIONS
// =============================================================================

export const userQueryOptions = (
	enabled: boolean = true,
	skipGlobalErrorHandler: boolean = false,
) =>
	queryOptions({
		queryKey: queryKeys.auth.user(),
		queryFn: getUser,
		enabled,
		meta: {
			skipGlobalErrorHandler,
		},
	})

// =============================================================================
// LOGIN MUTATION OPTIONS
// =============================================================================

export const loginMutationOptions = () =>
	mutationOptions({
		mutationKey: mutationKeys.auth.login,
		mutationFn: (body: LoginInput) => login(body),
	})

// =============================================================================
// REGISTER MUTATION OPTIONS
// =============================================================================

export const registerMutationOptions = () =>
	mutationOptions({
		mutationKey: mutationKeys.auth.register,
		mutationFn: (body: RegisterInput) => register(body),
	})

// =============================================================================
// LOGOUT MUTATION OPTIONS
// =============================================================================

export const logoutMutationOptions = () =>
	mutationOptions({
		mutationKey: mutationKeys.auth.logout,
		mutationFn: () => logout(),
	})
