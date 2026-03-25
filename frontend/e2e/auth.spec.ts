import { expect, test } from "@playwright/test"

// Тесты аутентификации должны запускаться без сохраненной сессии
test.use({ storageState: { cookies: [], origins: [] } })

test.describe("Authentication", () => {
	// === LOGIN PAGE ===

	test.describe("Login Page", () => {
		test.beforeEach(async ({ page }) => {
			await page.goto("/auth/login")
		})

		test("должна отображать форму логина", async ({ page }) => {
			await expect(
				page.getByRole("heading", { name: "Welcome Back" }),
			).toBeVisible()
			await expect(page.getByLabel("Email")).toBeVisible()
			await expect(
				page.getByLabel("Password", { exact: true }),
			).toBeVisible()
			await expect(
				page.getByRole("button", { name: "Login" }),
			).toBeVisible()
			await expect(
				page.getByRole("link", { name: "Register" }),
			).toBeVisible()
		})

		test("должна показать ошибки валидации при пустой форме", async ({ page }) => {
			await page.getByRole("button", { name: "Login" }).click()

			await expect(
				page.getByText("Enter a valid email address"),
			).toBeVisible()
			await expect(
				page.getByText("Password must be at least 6 characters"),
			).toBeVisible()
		})

		test("должна показать ошибку при невалидном email", async ({ page }) => {
			await page.getByLabel("Email").fill("not-an-email")
			await page
				.getByLabel("Password", { exact: true })
				.fill("validpassword")
			await page.getByRole("button", { name: "Login" }).click()

			await expect(
				page.getByText("Enter a valid email address"),
			).toBeVisible()
		})

		test("должна показать ошибку при коротком пароле", async ({ page }) => {
			await page.getByLabel("Email").fill("test@test.com")
			await page.getByLabel("Password", { exact: true }).fill("12345")
			await page.getByRole("button", { name: "Login" }).click()

			await expect(
				page.getByText("Password must be at least 6 characters"),
			).toBeVisible()
		})

		test("должна перейти на страницу регистрации по ссылке", async ({ page }) => {
			await page.getByRole("link", { name: "Register" }).click()

			await page.waitForURL("**/auth/register**")
			await expect(
				page.getByRole("heading", { name: "Create Account" }),
			).toBeVisible()
		})
	})

	// === REGISTER PAGE ===

	test.describe("Register Page", () => {
		test.beforeEach(async ({ page }) => {
			await page.goto("/auth/register")
		})

		test("должна отображать форму регистрации", async ({ page }) => {
			await expect(
				page.getByRole("heading", { name: "Create Account" }),
			).toBeVisible()
			await expect(page.getByLabel("Full Name")).toBeVisible()
			await expect(page.getByLabel("Email")).toBeVisible()
			await expect(
				page.getByLabel("Password", { exact: true }),
			).toBeVisible()
			await expect(page.getByLabel("Confirm Password")).toBeVisible()
			await expect(page.locator("#agreeToTerms")).toBeVisible()
			await expect(
				page.getByRole("button", { name: "Create Account" }),
			).toBeVisible()
			await expect(page.getByRole("link", { name: "Login" })).toBeVisible()
		})

		test("должна показать ошибки валидации при пустой форме", async ({ page }) => {
			await page.getByRole("button", { name: "Create Account" }).click()

			await expect(
				page.getByText("Name must be at least 2 characters"),
			).toBeVisible()
			await expect(
				page.getByText("Enter a valid email address"),
			).toBeVisible()
			await expect(
				page.getByText("Password must be at least 6 characters"),
			).toBeVisible()
			await expect(
				page.getByText("You must agree to the terms and conditions"),
			).toBeVisible()
		})

		test("должна показать ошибку при несовпадении паролей", async ({ page }) => {
			await page.getByLabel("Full Name").fill("Test")
			await page.getByLabel("Email").fill("test@test.com")
			await page
				.getByLabel("Password", { exact: true })
				.fill("password123")
			await page.getByLabel("Confirm Password").fill("differentpassword")
			await page.locator("#agreeToTerms").click()
			await page.getByRole("button", { name: "Create Account" }).click()

			await expect(page.getByText("Passwords don't match")).toBeVisible()
		})

		test("должна показать ошибку без согласия с условиями", async ({ page }) => {
			await page.getByLabel("Full Name").fill("Test")
			await page.getByLabel("Email").fill("test@test.com")
			await page
				.getByLabel("Password", { exact: true })
				.fill("password123")
			await page.getByLabel("Confirm Password").fill("password123")
			await page.getByRole("button", { name: "Create Account" }).click()

			await expect(
				page.getByText("You must agree to the terms and conditions"),
			).toBeVisible()
		})

		test("должна перейти на страницу логина по ссылке", async ({ page }) => {
			await page.getByRole("link", { name: "Login" }).click()

			await page.waitForURL("**/auth/login**")
			await expect(
				page.getByRole("heading", { name: "Welcome Back" }),
			).toBeVisible()
		})
	})

	// === AUTH GUARD ===

	test.describe("Auth Guard", () => {
		test("должен перенаправить неаутентифицированного пользователя на логин", async ({ page }) => {
			await page.goto("/dashboard")
			await page.waitForURL("**/auth/login**")
			await expect(
				page.getByRole("heading", { name: "Welcome Back" }),
			).toBeVisible()
		})
	})
})
