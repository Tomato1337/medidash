import {
	All,
	Controller,
	Logger,
	Req,
	UseGuards,
	HttpException,
	HttpStatus,
} from "@nestjs/common"
import { ApiBearerAuth, ApiExcludeController } from "@nestjs/swagger"
import type { FastifyRequest } from "fastify"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { Public } from "../auth/decorators/public.decorator"
import { HttpClientService } from "../common/http-client.service"

@ApiExcludeController()
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentProxyController {
	private readonly logger = new Logger(DocumentProxyController.name)

	constructor(private readonly httpClient: HttpClientService) {}

	@Public()
	@All(["tags", "tags/*"])
	async proxyTags(@Req() req: FastifyRequest): Promise<unknown> {
		return this.proxyToDocumentService(req)
	}

	@All(["documents/*", "documents", "records/*", "records"])
	async proxyDocuments(@Req() req: FastifyRequest): Promise<unknown> {
		return this.proxyToDocumentService(req)
	}

	private async proxyToDocumentService(
		req: FastifyRequest,
	): Promise<unknown> {
		const url = req.url

		const headers: Record<string, string> = {}
		const user = (req as any).user
		if (user && user.id) {
			headers["x-user-id"] = user.id
		}

		const contentType = req.headers["content-type"]
		const isMultipart = contentType?.includes("multipart/form-data")

		switch (req.method) {
			case "GET":
				return await this.httpClient.get("document", url, headers)
			case "POST":
				if (isMultipart) {
					this.logger.debug(
						`Processing multipart request: ${url} (${contentType})`,
					)

					// Копируем заголовки включая Content-Type с оригинальным boundary
					const proxyHeaders = {
						...headers,
						"content-type": contentType!, // Сохраняем оригинальный Content-Type с boundary
					}

					// Проксируем raw request body без парсинга
					return await this.httpClient.postRaw(
						"document",
						url,
						req.raw as unknown as BodyInit,
						proxyHeaders,
					)
				} else {
					// Для обычных JSON запросов
					return await this.httpClient.post(
						"document",
						url,
						req.body,
						headers,
					)
				}
			case "PUT":
				return await this.httpClient.put(
					"document",
					url,
					req.body,
					headers,
				)
			case "PATCH":
				return await this.httpClient.patch(
					"document",
					url,
					req.body,
					headers,
				)
			case "DELETE":
				return await this.httpClient.delete("document", url, headers)
			default:
				throw new HttpException(
					"Method not allowed",
					HttpStatus.METHOD_NOT_ALLOWED,
				)
		}
	}
}
