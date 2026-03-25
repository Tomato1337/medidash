import { test, expect } from "@playwright/test"

test.describe("Document Upload", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/dashboard")
	})

	// === ДИАЛОГ СОЗДАНИЯ ===

	test.describe("Create Document Dialog", () => {
		test("должна открывать диалог по кнопке +", async ({ page }) => {
			const plusButton = page.locator("button").filter({ has: page.locator("svg.lucide-plus") })
			await plusButton.click()

			await expect(
				page.getByRole("heading", { name: "Создать документ" }),
			).toBeVisible()
			await expect(
				page.getByText(
					"Загрузите медицинские документы для обработки",
				),
			).toBeVisible()
		})

		test("должна отображать все элементы формы", async ({ page }) => {
			const plusButton = page.locator("button").filter({ has: page.locator("svg.lucide-plus") })
			await plusButton.click()

			// Поле названия с AI-оверлеем
			await expect(
				page.getByText("Название будет сгенерировано AI"),
			).toBeVisible()

			// Поле даты с AI-оверлеем
			await expect(
				page.getByText("Дата будет сгенерирована AI"),
			).toBeVisible()

			// Поле тегов с AI-оверлеем
			await expect(
				page.getByText("Тэги будут сгенерированы AI"),
			).toBeVisible()

			// Дропзона
			await expect(
				page.getByText(
					"Перетащите файлы сюда или кликните для выбора файлов",
				),
			).toBeVisible()

			// Кнопки
			await expect(
				page.getByRole("button", { name: "Создать документ" }),
			).toBeVisible()
			await expect(
				page.getByRole("button", { name: "Отмена" }),
			).toBeVisible()
		})

		test("должна закрывать диалог по кнопке Отмена", async ({ page }) => {
			const plusButton = page.locator("button").filter({ has: page.locator("svg.lucide-plus") })
			await plusButton.click()

			await expect(
				page.getByRole("heading", { name: "Создать документ" }),
			).toBeVisible()

			await page.getByRole("button", { name: "Отмена" }).click()

			await expect(
				page.getByRole("heading", { name: "Создать документ" }),
			).not.toBeVisible()
		})

		test("должна закрывать диалог по Escape", async ({ page }) => {
			const plusButton = page.locator("button").filter({ has: page.locator("svg.lucide-plus") })
			await plusButton.click()

			await expect(
				page.getByRole("heading", { name: "Создать документ" }),
			).toBeVisible()

			await page.keyboard.press("Escape")

			await expect(
				page.getByRole("heading", { name: "Создать документ" }),
			).not.toBeVisible()
		})
	})

	// === AI TOGGLES ===

	test.describe("AI Toggle Buttons", () => {
		test.beforeEach(async ({ page }) => {
			const plusButton = page.locator("button").filter({ has: page.locator("svg.lucide-plus") })
			await plusButton.click()
		})

		test("должна показать поле Название при отключении AI", async ({
			page,
		}) => {
			// По умолчанию AI включен — поле заблокировано
			await expect(
				page.getByText("Название будет сгенерировано AI"),
			).toBeVisible()

			// Кликаем первую кнопку с иконкой Sparkles (toggle для названия)
			const aiToggleButtons = page.locator(
				'button:has(svg.lucide-sparkles)',
			)
			await aiToggleButtons.first().click()

			// AI-оверлей должен исчезнуть
			await expect(
				page.getByText("Название будет сгенерировано AI"),
			).not.toBeVisible()
		})

		test("должна показать DatePicker при отключении AI для даты", async ({
			page,
		}) => {
			await expect(
				page.getByText("Дата будет сгенерирована AI"),
			).toBeVisible()

			// Вторая кнопка Sparkles — toggle для даты
			const aiToggleButtons = page.locator(
				'button:has(svg.lucide-sparkles)',
			)
			await aiToggleButtons.nth(1).click()

			await expect(
				page.getByText("Дата будет сгенерирована AI"),
			).not.toBeVisible()
		})

		test("должна показать селектор тегов при отключении AI для тегов", async ({
			page,
		}) => {
			await expect(
				page.getByText("Тэги будут сгенерированы AI"),
			).toBeVisible()

			// Третья кнопка Sparkles — toggle для тегов
			const aiToggleButtons = page.locator(
				'button:has(svg.lucide-sparkles)',
			)
			await aiToggleButtons.nth(2).click()

			await expect(
				page.getByText("Тэги будут сгенерированы AI"),
			).not.toBeVisible()
		})
	})

	// === ВАЛИДАЦИЯ ФОРМЫ ===

	test.describe("Form Validation", () => {
		test("должна показать ошибку при отправке без AI и без названия", async ({
			page,
		}) => {
			const plusButton = page.locator("button").filter({ has: page.locator("svg.lucide-plus") })
			await plusButton.click()

			// Отключаем AI для названия
			const aiToggleButtons = page.locator(
				'button:has(svg.lucide-sparkles)',
			)
			await aiToggleButtons.first().click()

			// Отправляем форму без заполнения
			await page
				.getByRole("button", { name: "Создать документ" })
				.click()

			await expect(
				page.getByText("Название обязательно"),
			).toBeVisible()
		})
	})

	// === ДРОПЗОНА ===

	test.describe("Dropzone", () => {
		test("должна отображать текст дропзоны", async ({ page }) => {
			const plusButton = page.locator("button").filter({ has: page.locator("svg.lucide-plus") })
			await plusButton.click()

			await expect(
				page.getByText(
					"Перетащите файлы сюда или кликните для выбора файлов",
				),
			).toBeVisible()
		})
	})
})
