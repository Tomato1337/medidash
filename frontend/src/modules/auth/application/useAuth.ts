import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/shared/api/queries"
import {
	userQueryOptions,
	loginMutationOptions,
	registerMutationOptions,
} from "./queries"

// =============================================================================
// GET USER USE CASE
// =============================================================================

export function useUser(enabled: boolean = true) {
	return useQuery(userQueryOptions(enabled))
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
