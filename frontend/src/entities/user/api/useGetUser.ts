import { client } from "@/shared/api/api"
import { useQuery } from "@tanstack/react-query"

export const useGetUser = (isDashboard: boolean) => {
	return useQuery({
		queryKey: ["user"],
		queryFn: async () => {
			const { data } = await client.GET("/api/user")
			return data
		},
		enabled: isDashboard,
	})
}
