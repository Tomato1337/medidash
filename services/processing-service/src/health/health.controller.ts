import { Controller, Get } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger"

interface HealthStatus {
	status: "ok"
	timestamp: string
	uptime: number
}

@ApiTags("health")
@Controller("health")
export class HealthController {
	constructor() {}

	@Get()
	@ApiOperation({
		summary: "Health check for Document Service",
	})
	@ApiResponse({
		status: 200,
		description: "Health status of the system",
	})
	async check(): Promise<HealthStatus> {
		return {
			status: "ok",
			timestamp: new Date().toISOString(),
			uptime: process.uptime(),
		}
	}

	@Get("ping")
	@ApiOperation({ summary: "Simple ping endpoint" })
	@ApiResponse({ status: 200, description: "Returns pong" })
	ping(): { message: string } {
		return { message: "pong" }
	}
}
