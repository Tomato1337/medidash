import { z } from "zod"

export const envSchema = z.object({
	NODE_ENV: z.enum(["dev", "prod", "test"]).default("dev"),
	PROCESSING_SERVICE_PORT: z.coerce.number().min(1).max(65535).default(3002),
	LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

	// Database
	DATABASE_URL: z.string().url(),

	// Redis
	REDIS_HOST: z.string().default("localhost"),
	REDIS_PORT: z.coerce.number().default(6379),
	REDIS_PASSWORD: z.string().optional(),

	// MinIO
	MINIO_ENDPOINT: z.string().default("localhost"),
	MINIO_PORT: z.coerce.number().default(9000),
	MINIO_ACCESS_KEY: z.string().default("minioadmin"),
	MINIO_SECRET_KEY: z.string().default("minioadmin"),
	MINIO_USE_SSL: z.preprocess(
		(val) => val === "true" || val === true,
		z.boolean().default(false),
	),
	MINIO_BUCKET: z.string().default("medical-documents"),

	// BullMQ
	PARSING_CONCURRENCY: z.coerce.number().default(2),
	AI_PROCESSING_CONCURRENCY: z.coerce.number().default(1),
	BULL_RETRY_ATTEMPTS: z.coerce.number().default(3),

	// Chunking
	CHUNK_SIZE: z.coerce.number().default(800), // токенов
	CHUNK_OVERLAP: z.coerce.number().default(100), // токенов

	// AI Service
	AI_SERVICE_URL: z.string().url().default("http://localhost:3003"),
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
