import { Test, TestingModule } from "@nestjs/testing"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { HealthController } from "./health.controller"

describe("HealthController", () => {
	let controller: HealthController

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [HealthController],
		}).compile()

		controller = module.get<HealthController>(HealthController)
	})

	describe("check", () => {
		it("should return ok status with timestamp and uptime", async () => {
			// Arrange
			const uptimeSpy = vi.spyOn(process, "uptime").mockReturnValue(101.25)
			const dateSpy = vi
				.spyOn(Date.prototype, "toISOString")
				.mockReturnValue("2026-03-22T12:00:00.000Z")

			// Act
			const result = await controller.check()

			// Assert
			expect(result).toEqual({
				status: "ok",
				timestamp: "2026-03-22T12:00:00.000Z",
				uptime: 101.25,
			})

			uptimeSpy.mockRestore()
			dateSpy.mockRestore()
		})
	})

	describe("ping", () => {
		it("should return pong", () => {
			// Act
			const result = controller.ping()

			// Assert
			expect(result).toEqual({ message: "pong" })
		})
	})
})
