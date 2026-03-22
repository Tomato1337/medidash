import z from "zod"

export const createSharedAccessSchema = z.object({
	name: z
		.string()
		.min(1, { message: "Введите имя профиля" })
		.max(100, { message: "Максимум 100 символов" }),
	durationDays: z
		.number({ message: "Введите количество дней" })
		.int({ message: "Только целое число" })
		.min(1, { message: "Минимум 1 день" })
		.max(7, { message: "Максимум 7 дней" }),
	currentPassword: z.string().min(6, { message: "Минимум 6 символов" }),
})

export type CreateSharedAccessForm = z.infer<typeof createSharedAccessSchema>

export const verifySharedAccessSchema = z.object({
	password: z.string().min(1, { message: "Введите пароль" }),
})

export type VerifySharedAccessForm = z.infer<typeof verifySharedAccessSchema>
