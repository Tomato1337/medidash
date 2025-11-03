import { z } from "zod"

export const envSchema = z.object({
	NODE_ENV: z.enum(["dev", "prod", "test"]).default("dev"),
	API_GATEWAY_PORT: z.coerce.number().min(1).max(65535).default(3000),
	LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

	DATABASE_URL: z.url(),

	REDIS_HOST: z.string().default("localhost"),
	REDIS_PORT: z.coerce.number().default(6379),
	REDIS_PASSWORD: z.string().optional(),

	JWT_SECRET: z
		.string()
		.min(16, "JWT_SECRET должен содержать минимум 16 символов"),
	JWT_EXPIRES_IN: z.string().default("15m"),
	JWT_REFRESH_SECRET: z
		.string()
		.min(16, "JWT_REFRESH_SECRET должен содержать минимум 16 символов"),
	JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

	CORS_ORIGIN: z.string().default("http://localhost:5173"),

	DOCUMENT_SERVICE_URL: z.url(),
	PROCESSING_SERVICE_URL: z.url(),
	AI_SERVICE_URL: z.url(),
	SEARCH_SERVICE_URL: z.url(),

	RATE_LIMIT_TTL: z.coerce.number().default(60), // seconds
	RATE_LIMIT_MAX: z.coerce.number().default(100), // requests per TTL
})

export type Env = z.infer<typeof envSchema>

export function validateEnv(config: Record<string, unknown>): Env {
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
