import { z } from "zod"

export const envSchema = z.object({
	NODE_ENV: z.enum(["dev", "prod", "test"]).default("dev"),
	AI_SERVICE_PORT: z.coerce.number().min(1).max(65535).default(3003),
	LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

	DATABASE_URL: z.url(),

	// Gemini API
	GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),

	// Anonymizer Service (Python)
	ANONYMIZER_SERVICE_URL: z.url().default("http://localhost:8000"),

	// Rate limiting для Gemini API (free tier)
	GEMINI_RATE_LIMIT_DELAY_MS: z.coerce.number().default(1500), // 1.5 sec между запросами
})

export type Env = z.infer<typeof envSchema>

export function validateEnv(config: Record<string, unknown>): Env {
	try {
		const parsedConfig = envSchema.parse(config)
		console.log(
			"✅ Environment variables validated successfully",
			parsedConfig,
		)
		return parsedConfig
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
