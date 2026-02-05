import { client } from "@/shared/api/api"

export async function getTags() {
	const { data, error, response } = await client.GET("/api/tags")

	if (error || !response.ok) {
		throw new Error((error as any)?.message || "Failed to fetch tags")
	}

	return data
}
