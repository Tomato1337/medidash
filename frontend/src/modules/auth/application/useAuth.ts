import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/shared/api/queries"
import {
	userQueryOptions,
	loginMutationOptions,
	registerMutationOptions,
	logoutMutationOptions,
} from "./queries"

// =============================================================================
// GET USER USE CASE
// =============================================================================

export function useUser(
	enabled: boolean = true,
	skipGlobalErrorHandler: boolean = false,
) {
	return useQuery(userQueryOptions(enabled, skipGlobalErrorHandler))
}

// =============================================================================
// LOGIN USE CASE
// =============================================================================

export function useLogin() {
	const queryClient = useQueryClient()

	return useMutation({
		...loginMutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.auth.user() })
		},
	})
}

// =============================================================================
// REGISTER USE CASE
// =============================================================================

export function useRegister() {
	return useMutation(registerMutationOptions())
}

// =============================================================================
// LOGOUT USE CASE
// =============================================================================

export function useLogout() {
	const queryClient = useQueryClient()

	return useMutation({
		...logoutMutationOptions(),
		onSuccess: () => {
			queryClient.removeQueries({ queryKey: queryKeys.auth.user() })
			queryClient.removeQueries({ queryKey: queryKeys.documents.all })
			queryClient.removeQueries({ queryKey: queryKeys.records.all })
		},
	})
}
