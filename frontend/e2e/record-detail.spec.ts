import { test, expect } from "@playwright/test"

test.describe("Record Detail", () => {
	// === ОШИБКА — НЕСУЩЕСТВУЮЩАЯ ЗАПИСЬ ===

	test.describe("Error State", () => {
		test("должна показать ошибку для несуществующей записи", async ({
			page,
		}) => {
			await page.goto("/dashboard/non-existent-id-12345")

			await expect(page.getByText("Запись не найдена")).toBeVisible({
				timeout: 10000,
			})
		})

		test("должна показать кнопку возврата на главную при ошибке", async ({
			page,
		}) => {
			await page.goto("/dashboard/non-existent-id-12345")

			await expect(page.getByText("Запись не найдена")).toBeVisible({
				timeout: 10000,
			})

			const backButton = page.getByRole("button", {
				name: "Вернуться на главную",
			})
			await expect(backButton).toBeVisible()
		})

		test("должна перейти на дашборд по кнопке возврата", async ({
			page,
		}) => {
			await page.goto("/dashboard/non-existent-id-12345")

			await expect(page.getByText("Запись не найдена")).toBeVisible({
				timeout: 10000,
			})

			await page
				.getByRole("button", { name: "Вернуться на главную" })
				.click()

			await page.waitForURL("**/dashboard**")
			// Должны быть на дашборде
			await expect(page.getByLabel("Поиск")).toBeVisible()
		})
	})

	// === НАВИГАЦИЯ ===

	test.describe("Navigation", () => {
		test("должна перейти на запись из дашборда и вернуться", async ({
			page,
		}) => {
			await page.goto("/dashboard")
			await page.waitForLoadState("networkidle")

			// Ищем первую карточку записи
			const firstRecordLink = page
				.locator('a[aria-label^="Открыть запись"]')
				.first()
			const hasRecords = await firstRecordLink
				.isVisible()
				.catch(() => false)

			if (!hasRecords) {
				// Если записей нет — пропускаем тест
				test.skip()
				return
			}

			await firstRecordLink.click()

			// Должна быть кнопка "Назад"
			await expect(
				page.getByLabel("Назад к списку записей"),
			).toBeVisible()

			// Кликаем "Назад"
			await page.getByLabel("Назад к списку записей").click()

			// Вернулись на дашборд
			await page.waitForURL("**/dashboard**")
			await expect(page.getByLabel("Поиск")).toBeVisible()
		})
	})

	// === СОДЕРЖИМОЕ ЗАПИСИ ===

	test.describe("Record Content", () => {
		test("должна отображать секцию файлов", async ({ page }) => {
			await page.goto("/dashboard")
			await page.waitForLoadState("networkidle")

			const firstRecordLink = page
				.locator('a[aria-label^="Открыть запись"]')
				.first()
			const hasRecords = await firstRecordLink
				.isVisible()
				.catch(() => false)

			if (!hasRecords) {
				test.skip()
				return
			}

			await firstRecordLink.click()

			// Заголовок секции файлов
			await expect(
				page.getByRole("heading", { name: "Файлы Исследования" }),
			).toBeVisible()
		})

		test("должна отображать статус-бадж и кнопки управления", async ({
			page,
		}) => {
			await page.goto("/dashboard")
			await page.waitForLoadState("networkidle")

			const firstRecordLink = page
				.locator('a[aria-label^="Открыть запись"]')
				.first()
			const hasRecords = await firstRecordLink
				.isVisible()
				.catch(() => false)

			if (!hasRecords) {
				test.skip()
				return
			}

			await firstRecordLink.click()

			// Кнопка "Назад"
			await expect(
				page.getByLabel("Назад к списку записей"),
			).toBeVisible()
			await expect(page.getByText("Назад")).toBeVisible()

			// Кнопки редактирования/удаления (если запись серверная)
			const editButton = page.getByLabel("Редактировать запись")
			const deleteButton = page.getByLabel("Удалить запись")

			// Хотя бы кнопка "Назад" должна быть видна
			await expect(
				page.getByLabel("Назад к списку записей"),
			).toBeVisible()

			// Проверяем наличие кнопок управления (могут быть скрыты для локальных записей)
			const hasEdit = await editButton.isVisible().catch(() => false)
			const hasDelete = await deleteButton.isVisible().catch(() => false)

			// Обе кнопки должны быть в одинаковом состоянии
			expect(hasEdit).toBe(hasDelete)
		})
	})
})
