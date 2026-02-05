import { queryOptions } from "@tanstack/react-query"
import { getTags } from "../infrastructure/tagsApi"
import { queryKeys } from "@/shared/api/queries"

export const tagsQueryOptions = queryOptions({
	queryKey: queryKeys.tags.all(),
	queryFn: getTags,
	staleTime: 1000 * 60 * 5, // 5 minutes
})
