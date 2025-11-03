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

@ApiTags("Search")
@Controller("api/search")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SearchProxyController {
	constructor(private readonly httpClient: HttpClientService) {}

	@All("*")
	async proxyToSearchService(@Req() req: FastifyRequest): Promise<unknown> {
		const path = req.url.replace("/api/search", "")
		const url = `/api/search${path}`

		switch (req.method) {
			case "GET":
				return await this.httpClient.get("search", url)
			case "POST":
				return await this.httpClient.post("search", url, req.body)
			case "PUT":
				return await this.httpClient.put("search", url, req.body)
			case "PATCH":
				return await this.httpClient.patch("search", url, req.body)
			case "DELETE":
				return await this.httpClient.delete("search", url)
			default:
				throw new HttpException(
					"Method not allowed",
					HttpStatus.METHOD_NOT_ALLOWED,
				)
		}
	}
}
