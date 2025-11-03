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

@ApiTags("Documents")
@Controller("api/documents")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentProxyController {
	constructor(private readonly httpClient: HttpClientService) {}

	@All("*")
	async proxyToDocumentService(@Req() req: FastifyRequest): Promise<unknown> {
		const path = req.url.replace("/api/documents", "")
		const url = `/api/documents${path}`

		switch (req.method) {
			case "GET":
				return await this.httpClient.get("document", url)
			case "POST":
				return await this.httpClient.post("document", url, req.body)
			case "PUT":
				return await this.httpClient.put("document", url, req.body)
			case "PATCH":
				return await this.httpClient.patch("document", url, req.body)
			case "DELETE":
				return await this.httpClient.delete("document", url)
			default:
				throw new HttpException(
					"Method not allowed",
					HttpStatus.METHOD_NOT_ALLOWED,
				)
		}
	}
}
