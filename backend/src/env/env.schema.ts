import { z } from "zod"

export const envSchema = z.object({
	NODE_ENV: z.enum(["dev", "prod"]).default("dev"),
	PORT: z.coerce.number().min(1).max(65535).default(3000),
	DATABASE_URL: z.url(),
	JWT_EXPIRES_IN: z.string().default("1d"),
	JWT_ACCESS_TOKEN_SECRET: z
		.string()
		.min(16, "JWT_ACCESS_TOKEN_SECRET должен содержать минимум 16 символа"),
	JWT_ACCESS_TOKEN_EXPIRATION_MS: z.coerce.number().default(900000), // 15 минут
	JWT_REFRESH_TOKEN_SECRET: z
		.string()
		.min(
			16,
			"JWT_REFRESH_TOKEN_SECRET должен содержать минимум 16 символа",
		),
	JWT_REFRESH_TOKEN_EXPIRATION_MS: z.coerce.number().default(604800000), // 7 дней
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
