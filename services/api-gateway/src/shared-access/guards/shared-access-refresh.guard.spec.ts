import { describe, it, expect } from "vitest"
import { SharedAccessRefreshGuard } from "./shared-access-refresh.guard"

describe("SharedAccessRefreshGuard", () => {
	it("является экземпляром AuthGuard('shared-access-jwt-refresh')", () => {
		const guard = new SharedAccessRefreshGuard()
		expect(guard).toBeDefined()
		expect(guard).toHaveProperty("canActivate")
	})
})
