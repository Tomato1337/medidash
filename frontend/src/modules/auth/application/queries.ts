import { queryOptions, mutationOptions } from "@tanstack/react-query"
import { queryKeys, mutationKeys } from "@/shared/api/queries"
import { login, register, getUser } from "../infrastructure/authApi"
import type { LoginInput, RegisterInput } from "../domain/types"

// =============================================================================
// USER QUERY OPTIONS
// =============================================================================

export const userQueryOptions = (enabled: boolean = true) =>
	queryOptions({
		queryKey: queryKeys.auth.user(),
		queryFn: getUser,
		enabled,
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
