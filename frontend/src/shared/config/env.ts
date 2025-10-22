import { z } from "zod"

export const envSchema = z.object({
	VITE_URL_TO_BACKEND: z.url(),
	VITE_TANSTACK_DEVTOOLS: z.enum(["true", "false"]).default("true"),
})

export type Env = z.infer<typeof envSchema>

function validateEnv(config: Record<string, unknown>): Env {
	try {
		return envSchema.parse(config)
	} catch (error) {
		if (error instanceof z.ZodError) {
			const errorMessages = error.issues
				.map((err) => `  - ${err.path.join(".")}: ${err.message}`)
				.join("\n")

			throw new Error(
				`❌ Ошибка валидации переменных окружения:\n${errorMessages}`,
			)
		}
		throw error
	}
}

export const env = validateEnv(import.meta.env)
