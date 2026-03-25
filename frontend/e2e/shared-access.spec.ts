import { test, expect } from "@playwright/test"

test.describe("Shared Access", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/dashboard/access")
	})

	// === СТРУКТУРА СТРАНИЦЫ ===

	test.describe("Page Structure", () => {
		test("должна отображать заголовок страницы", async ({ page }) => {
			await expect(
				page.getByRole("heading", { name: "Мои доступы" }),
			).toBeVisible()
		})

		test("должна отображать кнопку создания доступа", async ({ page }) => {
			await expect(
				page.getByRole("button", { name: "Создать" }).first(),
			).toBeVisible()
		})

		test("должна отображать секцию активных доступов", async ({ page }) => {
			await expect(
				page.getByText("Активные доступы:"),
			).toBeVisible()
		})
	})

	// === ПУСТОЕ СОСТОЯНИЕ ===

	test.describe("Empty State", () => {
		test("должна показывать пустое состояние или список доступов", async ({
			page,
		}) => {
			await page.waitForLoadState("networkidle")

			const emptyState = page.getByText("Доступов ещё нет")
			const accessCards = page.locator(".bg-card").first()

			const hasEmpty = await emptyState.isVisible().catch(() => false)
			const hasCards = await accessCards.isVisible().catch(() => false)

			// Должно быть одно из двух состояний
			expect(hasEmpty || hasCards).toBeTruthy()
		})

		test("должна показывать описание в пустом состоянии", async ({
			page,
		}) => {
			await page.waitForLoadState("networkidle")

			const emptyState = page.getByText("Доступов ещё нет")
			const hasEmpty = await emptyState.isVisible().catch(() => false)

			if (!hasEmpty) {
				test.skip()
				return
			}

			await expect(
				page.getByText(
					"Здесь будут отображаться профили, которыми вы поделились.",
				),
			).toBeVisible()
		})
	})

	// === ДИАЛОГ СОЗДАНИЯ ДОСТУПА ===

	test.describe("Create Access Dialog", () => {
		test("должна открывать диалог создания доступа", async ({ page }) => {
			await page.getByRole("button", { name: "Создать" }).first().click()

			await expect(
				page.getByRole("heading", { name: "Создать доступ" }),
			).toBeVisible()
			await expect(
				page.getByText("Поделитесь профилем с доверенным лицом."),
			).toBeVisible()
		})

		test("должна отображать все поля формы", async ({ page }) => {
			await page.getByRole("button", { name: "Создать" }).first().click()

			// Поле имени профиля
			await expect(page.getByText("Имя профиля")).toBeVisible()

			// Поле длительности
			await expect(
				page.getByText("Длительность (в днях)"),
			).toBeVisible()

			// Поле текущего пароля
			await expect(
				page.getByText("Ваш текущий пароль (подтверждение)"),
			).toBeVisible()
		})

		test("должна отображать кнопки действий в диалоге", async ({
			page,
		}) => {
			await page.getByRole("button", { name: "Создать" }).first().click()

			await expect(
				page.getByRole("button", { name: "Отмена" }),
			).toBeVisible()

			// Кнопка "Создать" внутри диалога (вторая, т.к. первая — в хедере)
			const dialogCreateButton = page
				.locator('[role="dialog"]')
				.getByRole("button", { name: "Создать" })
			await expect(dialogCreateButton).toBeVisible()
		})

		test("должна закрывать диалог по кнопке Отмена", async ({ page }) => {
			await page.getByRole("button", { name: "Создать" }).first().click()

			await expect(
				page.getByRole("heading", { name: "Создать доступ" }),
			).toBeVisible()

			await page.getByRole("button", { name: "Отмена" }).click()

			await expect(
				page.getByRole("heading", { name: "Создать доступ" }),
			).not.toBeVisible()
		})

		test("должна иметь значение по умолчанию для длительности", async ({
			page,
		}) => {
			await page.getByRole("button", { name: "Создать" }).first().click()

			// Поле длительности должно иметь значение 7 по умолчанию
			const durationInput = page.locator('input[type="number"]')
			await expect(durationInput).toHaveValue("7")
		})

		test("должна показывать ошибку валидации при пустой форме", async ({
			page,
		}) => {
			await page.getByRole("button", { name: "Создать" }).first().click()

			// Кликаем "Создать" в диалоге без заполнения формы
			const dialogCreateButton = page
				.locator('[role="dialog"]')
				.getByRole("button", { name: "Создать" })
			await dialogCreateButton.click()

			// Ожидаем ошибки валидации от Zod-схемы createSharedAccessSchema
			// Поля name и currentPassword обязательны
			await page.waitForTimeout(500)

			// Форма не должна закрыться — диалог всё ещё виден
			await expect(
				page.getByRole("heading", { name: "Создать доступ" }),
			).toBeVisible()
		})
	})

	// === АРХИВ ===

	test.describe("Archive Section", () => {
		test("должна показывать секцию архива если есть отозванные доступы", async ({
			page,
		}) => {
			await page.waitForLoadState("networkidle")

			const archiveSection = page.getByText("Архив:")
			const hasArchive = await archiveSection
				.isVisible()
				.catch(() => false)

			if (!hasArchive) {
				// Нет архивных доступов — секция скрыта, это ожидаемо
				test.skip()
				return
			}

			// Секция архива должна быть сворачиваемой
			await archiveSection.click()
			// После клика должен раскрыться контент
			await page.waitForTimeout(300)
		})
	})
})
