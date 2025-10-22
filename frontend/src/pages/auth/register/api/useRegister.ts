import { client, type DTO } from "@/shared/api/api"
import { useMutation } from "@tanstack/react-query"

export const useRegister = () => {
	return useMutation({
		mutationKey: ["register"],
		mutationFn: async (body: DTO["AuthRegisterDto"]) => {
			const { data } = await client.POST("/api/auth/register", { body })
			return data
		},
	})
}
