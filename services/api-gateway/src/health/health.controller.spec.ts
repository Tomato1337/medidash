import { Test, TestingModule } from "@nestjs/testing"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { HealthController } from "./health.controller"
import { HttpClientService } from "../common/http-client.service"

describe("HealthController", () => {
	let controller: HealthController
	let httpClient: {
		getServices: ReturnType<typeof vi.fn>
		checkHealth: ReturnType<typeof vi.fn>
	}

	beforeEach(async () => {
		httpClient = {
			getServices: vi.fn(),
			checkHealth: vi.fn(),
		}

		const module: TestingModule = await Test.createTestingModule({
			controllers: [HealthController],
			providers: [
				{
					provide: HttpClientService,
					useValue: httpClient,
				},
			],
		}).compile()

		controller = module.get<HealthController>(HealthController)
	})

	describe("check", () => {
		it("should return ok status when all services are healthy", async () => {
			// Arrange
			const services = [
				{ name: "document", baseUrl: "http://document:3001" },
				{ name: "processing", baseUrl: "http://processing:3002" },
			]
			httpClient.getServices.mockReturnValue(services)
			httpClient.checkHealth.mockResolvedValue(true)
			const uptimeSpy = vi.spyOn(process, "uptime").mockReturnValue(123.45)
			const dateSpy = vi
				.spyOn(Date.prototype, "toISOString")
				.mockReturnValue("2026-03-22T00:00:00.000Z")

			// Act
			const result = await controller.check()

			// Assert
			expect(httpClient.getServices).toHaveBeenCalledTimes(1)
			expect(httpClient.checkHealth).toHaveBeenCalledWith("document")
			expect(httpClient.checkHealth).toHaveBeenCalledWith("processing")
			expect(result).toEqual({
				status: "ok",
				timestamp: "2026-03-22T00:00:00.000Z",
				uptime: 123.45,
				services: [
					{
						name: "document",
						status: "healthy",
						url: "http://document:3001",
					},
					{
						name: "processing",
						status: "healthy",
						url: "http://processing:3002",
					},
				],
			})

			uptimeSpy.mockRestore()
			dateSpy.mockRestore()
		})

		it("should return degraded status when some services are unhealthy", async () => {
			// Arrange
			const services = [
				{ name: "document", baseUrl: "http://document:3001" },
				{ name: "processing", baseUrl: "http://processing:3002" },
			]
			httpClient.getServices.mockReturnValue(services)
			httpClient.checkHealth.mockImplementation(async (name: string) => {
				return name === "document"
			})
			const uptimeSpy = vi.spyOn(process, "uptime").mockReturnValue(98.76)
			const dateSpy = vi
				.spyOn(Date.prototype, "toISOString")
				.mockReturnValue("2026-03-22T00:00:01.000Z")

			// Act
			const result = await controller.check()

			// Assert
			expect(result.status).toBe("degraded")
			expect(result.services).toEqual([
				{
					name: "document",
					status: "healthy",
					url: "http://document:3001",
				},
				{
					name: "processing",
					status: "unhealthy",
					url: "http://processing:3002",
				},
			])

			uptimeSpy.mockRestore()
			dateSpy.mockRestore()
		})

		it("should return down status when all services are unhealthy", async () => {
			// Arrange
			const services = [
				{ name: "document", baseUrl: "http://document:3001" },
				{ name: "processing", baseUrl: "http://processing:3002" },
			]
			httpClient.getServices.mockReturnValue(services)
			httpClient.checkHealth.mockResolvedValue(false)
			const uptimeSpy = vi.spyOn(process, "uptime").mockReturnValue(45.67)
			const dateSpy = vi
				.spyOn(Date.prototype, "toISOString")
				.mockReturnValue("2026-03-22T00:00:02.000Z")

			// Act
			const result = await controller.check()

			// Assert
			expect(result.status).toBe("down")
			expect(result.services).toEqual([
				{
					name: "document",
					status: "unhealthy",
					url: "http://document:3001",
				},
				{
					name: "processing",
					status: "unhealthy",
					url: "http://processing:3002",
				},
			])

			uptimeSpy.mockRestore()
			dateSpy.mockRestore()
		})
	})

	describe("ping", () => {
		it("should return pong message", () => {
			// Act
			const result = controller.ping()

			// Assert
			expect(result).toEqual({ message: "pong" })
		})
	})
})
