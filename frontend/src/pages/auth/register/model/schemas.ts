import z from "zod"

export const registerSchema = z
	.object({
		name: z
			.string()
			.min(2, { message: "Name must be at least 2 characters" }),
		email: z.email({ message: "Enter a valid email address" }),
		password: z
			.string()
			.min(8, { message: "Password must be at least 8 characters" })
			.regex(/[A-Z]/, {
				message: "Password must contain at least one uppercase letter",
			})
			.regex(/[0-9]/, {
				message: "Password must contain at least one number",
			}),
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
