import { Controller, Get } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger"
import { HttpClientService } from "../common/http-client.service"

interface HealthStatus {
	status: "ok" | "degraded" | "down"
	timestamp: string
	uptime: number
	services: {
		name: string
		status: "healthy" | "unhealthy"
		url: string
	}[]
}

@ApiTags("health")
@Controller("health")
export class HealthController {
	constructor(private readonly httpClient: HttpClientService) {}

	@Get()
	@ApiOperation({
		summary: "Health check for API Gateway and all microservices",
	})
	@ApiResponse({
		status: 200,
		description: "Health status of the system",
	})
	async check(): Promise<HealthStatus> {
		const services = this.httpClient.getServices()

		const serviceStatuses = await Promise.all(
			services.map(async (service) => ({
				name: service.name,
				status: (await this.httpClient.checkHealth(service.name))
					? ("healthy" as const)
					: ("unhealthy" as const),
				url: service.baseUrl,
			})),
		)

		const allHealthy = serviceStatuses.every((s) => s.status === "healthy")
		const someHealthy = serviceStatuses.some((s) => s.status === "healthy")

		return {
			status: allHealthy ? "ok" : someHealthy ? "degraded" : "down",
			timestamp: new Date().toISOString(),
			uptime: process.uptime(),
			services: serviceStatuses,
		}
	}

	@Get("ping")
	@ApiOperation({ summary: "Simple ping endpoint" })
	@ApiResponse({ status: 200, description: "Returns pong" })
	ping(): { message: string } {
		return { message: "pong" }
	}
}
