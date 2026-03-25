import { describe, it, expect } from "vitest"
import { createSharedAccessSchema, verifySharedAccessSchema } from "./schemas"

describe("shared-access/domain/schemas", () => {
	describe("createSharedAccessSchema", () => {
		it("should validate correct payload", () => {
			// Arrange
			const input = {
				name: "Для терапевта",
				durationDays: 7,
				currentPassword: "secret12",
			}

			// Act
			const result = createSharedAccessSchema.safeParse(input)

			// Assert
			expect(result.success).toBe(true)
		})

		it("should reject empty name", () => {
			// Arrange
			const input = {
				name: "",
				durationDays: 7,
				currentPassword: "secret12",
			}

			// Act
			const result = createSharedAccessSchema.safeParse(input)

			// Assert
			expect(result.success).toBe(false)
			expect(result.error?.issues[0]?.message).toBe("Введите имя профиля")
		})

		it("should reject name longer than 100 chars", () => {
			// Arrange
			const input = {
				name: "a".repeat(101),
				durationDays: 7,
				currentPassword: "secret12",
			}

			// Act
			const result = createSharedAccessSchema.safeParse(input)

			// Assert
			expect(result.success).toBe(false)
			expect(result.error?.issues[0]?.message).toBe("Максимум 100 символов")
		})

		it("should reject duration below minimum", () => {
			// Arrange
			const input = {
				name: "Для хирурга",
				durationDays: 0,
				currentPassword: "secret12",
			}

			// Act
			const result = createSharedAccessSchema.safeParse(input)

			// Assert
			expect(result.success).toBe(false)
			expect(result.error?.issues[0]?.message).toBe("Минимум 1 день")
		})

		it("should reject duration above maximum", () => {
			// Arrange
			const input = {
				name: "Для хирурга",
				durationDays: 8,
				currentPassword: "secret12",
			}

			// Act
			const result = createSharedAccessSchema.safeParse(input)

			// Assert
			expect(result.success).toBe(false)
			expect(result.error?.issues[0]?.message).toBe("Максимум 7 дней")
		})

		it("should reject non-integer duration", () => {
			// Arrange
			const input = {
				name: "Для хирурга",
				durationDays: 2.5,
				currentPassword: "secret12",
			}

			// Act
			const result = createSharedAccessSchema.safeParse(input)

			// Assert
			expect(result.success).toBe(false)
			expect(result.error?.issues[0]?.message).toBe("Только целое число")
		})

		it("should reject non-number duration", () => {
			// Arrange
			const input = {
				name: "Для хирурга",
				durationDays: "7",
				currentPassword: "secret12",
			}

			// Act
			const result = createSharedAccessSchema.safeParse(input)

			// Assert
			expect(result.success).toBe(false)
			expect(result.error?.issues[0]?.message).toBe("Введите количество дней")
		})

		it("should reject short current password", () => {
			// Arrange
			const input = {
				name: "Для хирурга",
				durationDays: 3,
				currentPassword: "12345",
			}

			// Act
			const result = createSharedAccessSchema.safeParse(input)

			// Assert
			expect(result.success).toBe(false)
			expect(result.error?.issues[0]?.message).toBe("Минимум 6 символов")
		})
	})

	describe("verifySharedAccessSchema", () => {
		it("should validate non-empty password", () => {
			// Arrange
			const input = { password: "some-secret" }

			// Act
			const result = verifySharedAccessSchema.safeParse(input)

			// Assert
			expect(result.success).toBe(true)
		})

		it("should reject empty password", () => {
			// Arrange
			const input = { password: "" }

			// Act
			const result = verifySharedAccessSchema.safeParse(input)

			// Assert
			expect(result.success).toBe(false)
			expect(result.error?.issues[0]?.message).toBe("Введите пароль")
		})
	})
})
