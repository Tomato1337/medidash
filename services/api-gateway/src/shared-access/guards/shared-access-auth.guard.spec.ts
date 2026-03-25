import { describe, it, expect } from "vitest"
import { SharedAccessAuthGuard } from "./shared-access-auth.guard"

describe("SharedAccessAuthGuard", () => {
	it("является экземпляром AuthGuard('shared-access-jwt')", () => {
		const guard = new SharedAccessAuthGuard()
		expect(guard).toBeDefined()
		expect(guard).toHaveProperty("canActivate")
	})
})
