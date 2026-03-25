import { test, expect } from "@playwright/test"

test.describe("Dashboard", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/dashboard")
	})

	// === СТРУКТУРА СТРАНИЦЫ ===

	test.describe("Page Structure", () => {
		test("должна отображать основные элементы дашборда", async ({
			page,
		}) => {
			await expect(page.getByLabel("Поиск")).toBeVisible()
			await expect(page.getByLabel("Сортировка")).toBeVisible()
			await expect(page.getByLabel("Фильтр")).toBeVisible()
		})

		test("поле поиска должно иметь плейсхолдер", async ({ page }) => {
			await expect(page.getByPlaceholder("Поиск...")).toBeVisible()
		})

		test("должна отображать кнопку создания документа", async ({
			page,
		}) => {
			// Кнопка "+" для создания документа
			const plusButton = page.locator("button").filter({ has: page.locator("svg.lucide-plus") })
			await expect(plusButton).toBeVisible()
		})
	})

	// === ПОИСК ===

	test.describe("Search", () => {
		test("должна отображать кнопку очистки при вводе текста", async ({
			page,
		}) => {
			const searchInput = page.getByLabel("Поиск")
			await searchInput.fill("тест")

			await expect(page.getByLabel("Очистить поиск")).toBeVisible()
		})

		test("должна очищать поиск при нажатии на кнопку очистки", async ({
			page,
		}) => {
			const searchInput = page.getByLabel("Поиск")
			await searchInput.fill("тест")

			await page.getByLabel("Очистить поиск").click()

			await expect(searchInput).toHaveValue("")
			await expect(page.getByLabel("Очистить поиск")).not.toBeVisible()
		})

		test("должна обновлять URL с параметром search после debounce", async ({
			page,
		}) => {
			const searchInput = page.getByLabel("Поиск")
			await searchInput.fill("анализ")

			// Ждём debounce (400ms) + небольшой запас
			await page.waitForTimeout(600)

			await expect(page).toHaveURL(/search=/)
		})
	})

	// === СОРТИРОВКА ===

	test.describe("Sort Popover", () => {
		test("должна открывать попап сортировки", async ({ page }) => {
			await page.getByLabel("Сортировка").click()

			await expect(page.getByText("Дата записи")).toBeVisible()
			await expect(page.getByText("Дата создания")).toBeVisible()
			await expect(page.getByText("Название")).toBeVisible()
		})

		test("должна содержать кнопки направления сортировки", async ({
			page,
		}) => {
			await page.getByLabel("Сортировка").click()

			await expect(
				page.getByLabel("Сортировать Дата записи по возрастанию"),
			).toBeVisible()
			await expect(
				page.getByLabel("Сортировать Дата записи по убыванию"),
			).toBeVisible()
		})

		test("должна обновлять URL при смене сортировки", async ({ page }) => {
			await page.getByLabel("Сортировка").click()
			await page
				.getByLabel("Сортировать Название по возрастанию")
				.click()

			await expect(page).toHaveURL(/sortBy=title/)
			await expect(page).toHaveURL(/sortDir=asc/)
		})
	})

	// === ФИЛЬТР ===

	test.describe("Filter Popover", () => {
		test("должна открывать попап фильтра", async ({ page }) => {
			await page.getByLabel("Фильтр").click()

			await expect(page.getByText("Период")).toBeVisible()
			await expect(page.getByLabel("с")).toBeVisible()
			await expect(page.getByLabel("до")).toBeVisible()
		})

		test("должна содержать кнопку сброса фильтров", async ({ page }) => {
			await page.getByLabel("Фильтр").click()

			await expect(
				page.getByRole("button", { name: "Сбросить" }),
			).toBeVisible()
		})

		test("должна обновлять URL при установке даты", async ({ page }) => {
			await page.getByLabel("Фильтр").click()

			const dateFrom = page.locator("#records-filter-date-from")
			await dateFrom.fill("2025-01-01")

			await expect(page).toHaveURL(/dateFrom=2025-01-01/)
		})

		test("должна показывать чипы фильтров и кнопку сброса", async ({
			page,
		}) => {
			await page.getByLabel("Фильтр").click()

			const dateFrom = page.locator("#records-filter-date-from")
			await dateFrom.fill("2025-01-01")

			// Закрываем попап кликом вне
			await page.getByLabel("Поиск").click()

			// Должен появиться чип и кнопка "Сбросить все"
			await expect(page.getByText("с 2025-01-01")).toBeVisible()
			await expect(page.getByText("Сбросить все")).toBeVisible()
		})

		test("должна сбрасывать все фильтры по кнопке", async ({ page }) => {
			// Устанавливаем фильтр
			await page.getByLabel("Фильтр").click()
			const dateFrom = page.locator("#records-filter-date-from")
			await dateFrom.fill("2025-01-01")

			// Закрываем попап
			await page.getByLabel("Поиск").click()

			// Кликаем "Сбросить все"
			await page.getByText("Сбросить все").click()

			await expect(page.getByText("с 2025-01-01")).not.toBeVisible()
			await expect(page).not.toHaveURL(/dateFrom/)
		})
	})

	// === ПУСТОЕ СОСТОЯНИЕ ===

	test.describe("Empty State", () => {
		test("должна показывать пустое состояние или записи", async ({
			page,
		}) => {
			// Ждём загрузку
			await page.waitForLoadState("networkidle")

			// Должен быть либо пустое состояние, либо записи
			const emptyState = page.getByText(
				"У вас пока нет медицинских записей",
			)
			const notFoundState = page.getByText(
				"Нет результатов по вашему запросу",
			)
			const recordCards = page.locator('[class*="grid"]').first()

			const hasEmpty = await emptyState.isVisible().catch(() => false)
			const hasNotFound = await notFoundState
				.isVisible()
				.catch(() => false)
			const hasRecords = await recordCards.isVisible().catch(() => false)

			expect(hasEmpty || hasNotFound || hasRecords).toBeTruthy()
		})
	})
})
