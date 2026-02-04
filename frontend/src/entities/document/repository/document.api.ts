import { client } from "@/shared/api/api"
import { mutationOptions } from "@tanstack/react-query"

export const documentDownloadMutationOptions = () => {
	return mutationOptions({
		mutationFn: async (documentId: string) => {
			const { data, error } = await client.GET(
				"/api/documents/{id}/download-url",
				{
					params: { path: { id: documentId } },
				},
			)

			if (error) throw error

			return data
		},
	})
}
