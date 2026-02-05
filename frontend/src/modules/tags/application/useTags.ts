import { useQuery } from "@tanstack/react-query"
import { tagsQueryOptions } from "./queries"

export const useTags = () => {
	return useQuery(tagsQueryOptions)
}
