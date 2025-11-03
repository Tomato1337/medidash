import {
	All,
	Controller,
	Req,
	UseGuards,
	HttpException,
	HttpStatus,
} from "@nestjs/common"
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger"
import type { FastifyRequest } from "fastify"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { HttpClientService } from "../common/http-client.service"

@ApiTags("Processing")
@Controller("api/processing")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProcessingProxyController {
	constructor(private readonly httpClient: HttpClientService) {}

	@All("*")
	async proxyToProcessingService(
		@Req() req: FastifyRequest,
	): Promise<unknown> {
		const path = req.url.replace("/api/processing", "")
		const url = `/api/processing${path}`

		switch (req.method) {
			case "GET":
				return await this.httpClient.get("processing", url)
			case "POST":
				return await this.httpClient.post("processing", url, req.body)
			case "PUT":
				return await this.httpClient.put("processing", url, req.body)
			case "PATCH":
				return await this.httpClient.patch("processing", url, req.body)
			case "DELETE":
				return await this.httpClient.delete("processing", url)
			default:
				throw new HttpException(
					"Method not allowed",
					HttpStatus.METHOD_NOT_ALLOWED,
				)
		}
	}
}
