import { describe, it, expect } from "vitest"
import { loginSchema, registerSchema } from "./schemas"

describe("auth/domain/schemas", () => {
	describe("loginSchema", () => {
		it("should validate correct login payload", () => {
			// Arrange
			const input = {
				email: "doctor@example.com",
				password: "strong123",
			}

			// Act
			const result = loginSchema.safeParse(input)

			// Assert
			expect(result.success).toBe(true)
		})

		it("should reject invalid email", () => {
			// Arrange
			const input = {
				email: "invalid-email",
				password: "strong123",
			}

			// Act
			const result = loginSchema.safeParse(input)

			// Assert
			expect(result.success).toBe(false)
			expect(result.error?.issues[0]?.message).toBe(
				"Enter a valid email address",
			)
		})

		it("should reject too short password", () => {
			// Arrange
			const input = {
				email: "doctor@example.com",
				password: "12345",
			}

			// Act
			const result = loginSchema.safeParse(input)

			// Assert
			expect(result.success).toBe(false)
			expect(result.error?.issues[0]?.message).toBe(
				"Password must be at least 6 characters",
			)
		})

		it("should reject empty fields", () => {
			// Arrange
			const input = {
				email: "",
				password: "",
			}

			// Act
			const result = loginSchema.safeParse(input)

			// Assert
			expect(result.success).toBe(false)
		})
	})

	describe("registerSchema", () => {
		it("should validate correct register payload", () => {
			// Arrange
			const input = {
				name: "Dr. House",
				email: "house@example.com",
				password: "complex123",
				confirmPassword: "complex123",
				agreeToTerms: true,
			}

			// Act
			const result = registerSchema.safeParse(input)

			// Assert
			expect(result.success).toBe(true)
		})

		it("should reject too short name", () => {
			// Arrange
			const input = {
				name: "A",
				email: "house@example.com",
				password: "complex123",
				confirmPassword: "complex123",
				agreeToTerms: true,
			}

			// Act
			const result = registerSchema.safeParse(input)

			// Assert
			expect(result.success).toBe(false)
			expect(result.error?.issues[0]?.message).toBe(
				"Name must be at least 2 characters",
			)
		})

		it("should reject invalid email", () => {
			// Arrange
			const input = {
				name: "Dr. House",
				email: "house@",
				password: "complex123",
				confirmPassword: "complex123",
				agreeToTerms: true,
			}

			// Act
			const result = registerSchema.safeParse(input)

			// Assert
			expect(result.success).toBe(false)
			expect(result.error?.issues[0]?.message).toBe(
				"Enter a valid email address",
			)
		})

		it("should reject too short password", () => {
			// Arrange
			const input = {
				name: "Dr. House",
				email: "house@example.com",
				password: "12345",
				confirmPassword: "12345",
				agreeToTerms: true,
			}

			// Act
			const result = registerSchema.safeParse(input)

			// Assert
			expect(result.success).toBe(false)
			expect(result.error?.issues[0]?.message).toBe(
				"Password must be at least 6 characters",
			)
		})

		it("should reject when passwords do not match", () => {
			// Arrange
			const input = {
				name: "Dr. House",
				email: "house@example.com",
				password: "complex123",
				confirmPassword: "complex124",
				agreeToTerms: true,
			}

			// Act
			const result = registerSchema.safeParse(input)

			// Assert
			expect(result.success).toBe(false)
			expect(
				result.error?.issues.find((issue) => issue.path[0] === "confirmPassword")
					?.message,
			).toBe("Passwords don't match")
		})

		it("should reject when terms are not accepted", () => {
			// Arrange
			const input = {
				name: "Dr. House",
				email: "house@example.com",
				password: "complex123",
				confirmPassword: "complex123",
				agreeToTerms: false,
			}

			// Act
			const result = registerSchema.safeParse(input)

			// Assert
			expect(result.success).toBe(false)
			expect(
				result.error?.issues.find((issue) => issue.path[0] === "agreeToTerms")
					?.message,
			).toBe("You must agree to the terms and conditions")
		})

		it("should reject empty strings and undefined-like boundaries", () => {
			// Arrange
			const input = {
				name: "",
				email: "",
				password: "",
				confirmPassword: "",
				agreeToTerms: false,
			}

			// Act
			const result = registerSchema.safeParse(input)

			// Assert
			expect(result.success).toBe(false)
		})
	})
})
