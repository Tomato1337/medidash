import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { mutationKeys, queryKeys } from "@/shared/api/queries"
import {
	createSharedAccess,
	listSharedAccesses,
	revokeSharedAccess,
	revokeSharedAccessSession,
	listSharedAccessSessions,
	getSharedAccessInfo,
} from "../infrastructure/sharedAccessApi"
import { getSharedRecords } from "../infrastructure/sharedRecordsApi"

export function useSharedAccessList() {
	return useQuery({
		queryKey: queryKeys.sharedAccess.list(),
		queryFn: listSharedAccesses,
	})
}

export function useSharedAccessInfo(token: string) {
	return useQuery({
		queryKey: queryKeys.sharedAccess.info(token),
		queryFn: () => getSharedAccessInfo(token),
		enabled: !!token,
	})
}

export function useSharedCheckAuth(
	token: string,
	skipGlobalErrorHandler: boolean = false,
) {
	return useQuery({
		queryKey: queryKeys.sharedAccess.isAuthorized(token),
		queryFn: () => getSharedRecords(token),
		select: (data) => !!data,
		enabled: !!token,
		meta: {
			skipGlobalErrorHandler,
		},
		retry: false,
	})
}

export function useSharedAccessSessions(accessId: string) {
	return useQuery({
		queryKey: queryKeys.sharedAccess.sessions(accessId),
		queryFn: () => listSharedAccessSessions(accessId),
		enabled: !!accessId,
	})
}

export function useCreateSharedAccess() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationKey: mutationKeys.sharedAccess.create,
		mutationFn: createSharedAccess,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.sharedAccess.list(),
			})
		},
	})
}

export function useRevokeSharedAccess() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationKey: mutationKeys.sharedAccess.revoke,
		mutationFn: revokeSharedAccess,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.sharedAccess.list(),
			})
		},
	})
}

export function useRevokeSharedAccessSession() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationKey: mutationKeys.sharedAccess.revokeSession,
		mutationFn: ({
			accessId,
			sessionId,
		}: {
			accessId: string
			sessionId: string
		}) => revokeSharedAccessSession(accessId, sessionId),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.sharedAccess.sessions(variables.accessId),
			})
		},
	})
}
