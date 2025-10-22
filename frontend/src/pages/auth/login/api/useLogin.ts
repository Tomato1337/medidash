import { client, type DTO } from "@/shared/api/api"
import { useMutation } from "@tanstack/react-query"

export const useLogin = () => {
	return useMutation({
		mutationKey: ["login"],
		mutationFn: async (body: DTO["AuthLoginDto"]) => {
			const { data } = await client.POST("/api/auth/login", { body })
			return data
		},
	})
}
