import { queryOptions } from "@tanstack/react-query"
import { queryKeys } from "@/shared/api/queries"
import {
	listSharedAccesses,
	listSharedAccessSessions,
} from "../infrastructure/sharedAccessApi"

export const sharedAccessListQueryOptions = () =>
	queryOptions({
		queryKey: queryKeys.sharedAccess.list(),
		queryFn: listSharedAccesses,
	})

export const sharedAccessSessionsQueryOptions = (accessId: string) =>
	queryOptions({
		queryKey: queryKeys.sharedAccess.sessions(accessId),
		queryFn: () => listSharedAccessSessions(accessId),
		enabled: !!accessId,
	})
