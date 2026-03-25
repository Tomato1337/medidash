import { test as setup } from "@playwright/test"

import { STORAGE_STATE } from "../playwright.config"

setup("authenticate", async ({ page }) => {
	const timestamp = Date.now()
	const email = `e2e-test-${timestamp}@test.com`
	const name = "E2E Test User"
	const password = "testpassword123"

	await page.goto("/auth/register")

	await page.getByLabel("Full Name").fill(name)
	await page.getByLabel("Email").fill(email)
	await page.getByLabel("Password", { exact: true }).fill(password)
	await page.getByLabel("Confirm Password").fill(password)
	await page.locator("label[for='agreeToTerms']").click()

	await page.getByRole("button", { name: "Create Account" }).click()
	await page.waitForURL("**/dashboard**")

	await page.context().storageState({ path: STORAGE_STATE })
})
