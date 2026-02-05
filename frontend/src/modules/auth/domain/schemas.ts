import z from "zod"

// =============================================================================
// LOGIN SCHEMA
// =============================================================================

export const loginSchema = z.object({
	email: z.email({ message: "Enter a valid email address" }),
	password: z
		.string()
		.min(6, { message: "Password must be at least 6 characters" }),
})

export type LoginForm = z.infer<typeof loginSchema>

// =============================================================================
// REGISTER SCHEMA
// =============================================================================

export const registerSchema = z
	.object({
		name: z
			.string()
			.min(2, { message: "Name must be at least 2 characters" }),
		email: z.email({ message: "Enter a valid email address" }),
		password: z
			.string()
			.min(6, { message: "Password must be at least 6 characters" }),
		confirmPassword: z.string(),
		agreeToTerms: z.boolean().refine((val) => val === true, {
			message: "You must agree to the terms and conditions",
		}),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ["confirmPassword"],
	})

export type RegisterForm = z.infer<typeof registerSchema>
