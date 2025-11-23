import { client } from "@/shared/api/api"
import { useQuery } from "@tanstack/react-query"

export const useGetTags = () => {
	return useQuery({
		queryKey: ["tags"],
		queryFn: async () => {
			const { data, error, response } = await client.GET("/api/tags")

			if (error || !response.ok) {
				throw new Error(error.message)
			}

			return data
		},
		staleTime: 1000 * 60 * 5,
	})
}
