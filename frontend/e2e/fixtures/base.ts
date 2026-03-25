import { test as base, expect } from "@playwright/test"

import { STORAGE_STATE } from "../../playwright.config"

type Fixtures = {
	authenticatedPage: import("@playwright/test").Page
}

export const authenticatedTest = base.extend<Fixtures>({
	authenticatedPage: async ({ browser }, use) => {
		const context = await browser.newContext({ storageState: STORAGE_STATE })
		const page = await context.newPage()

		await use(page)
		await context.close()
	},
})

export const test = base
export const authTest = base.extend({})
authTest.use({ storageState: STORAGE_STATE })
export { expect, STORAGE_STATE }
