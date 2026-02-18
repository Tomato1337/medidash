import {
	All,
	Controller,
	Req,
	UseGuards,
	HttpException,
	HttpStatus,
	Get,
} from "@nestjs/common"
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger"
import type { FastifyRequest } from "fastify"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { HttpClientService } from "../common/http-client.service"
import { Public } from "../auth/decorators/public.decorator"

@ApiTags("Processing")
@Controller("processing")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProcessingProxyController {
	constructor(private readonly httpClient: HttpClientService) {}

	@Public()
	@Get("health")
	async healthCheck(@Req() req: FastifyRequest): Promise<unknown> {
		return await this.httpClient.get("processing", req.url)
	}

	@All("*")
	async proxyToProcessingService(
		@Req() req: FastifyRequest,
	): Promise<unknown> {
		const url = req.url
		const user = (req as any).user
		const headers: Record<string, string> = {}

		if (user && user.id) {
			headers["x-user-id"] = user.id
		}

		switch (req.method) {
			case "GET":
				return await this.httpClient.get("processing", url, headers)
			case "POST":
				return await this.httpClient.post(
					"processing",
					url,
					req.body,
					headers,
				)
			case "PUT":
				return await this.httpClient.put(
					"processing",
					url,
					req.body,
					headers,
				)
			case "PATCH":
				return await this.httpClient.patch(
					"processing",
					url,
					req.body,
					headers,
				)
			case "DELETE":
				return await this.httpClient.delete("processing", url, headers)
			default:
				throw new HttpException(
					"Method not allowed",
					HttpStatus.METHOD_NOT_ALLOWED,
				)
		}
	}
}
