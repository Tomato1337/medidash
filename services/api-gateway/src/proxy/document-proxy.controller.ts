import {
	All,
	Controller,
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
	constructor(private readonly httpClient: HttpClientService) {}

	@Public()
	@All("tags")
	async proxyTags(@Req() req: FastifyRequest): Promise<unknown> {
		return this.proxyToDocumentService(req)
	}

	@Public()
	@All("tags/*")
	async proxyTagsSub(@Req() req: FastifyRequest): Promise<unknown> {
		return this.proxyToDocumentService(req)
	}

	@All("documents/*")
	async proxyDocuments(@Req() req: FastifyRequest): Promise<unknown> {
		return this.proxyToDocumentService(req)
	}

	@All("documents")
	async proxyDocumentsBase(@Req() req: FastifyRequest): Promise<unknown> {
		return this.proxyToDocumentService(req)
	}

	@All("records/*")
	async proxyRecords(@Req() req: FastifyRequest): Promise<unknown> {
		return this.proxyToDocumentService(req)
	}

	@All("records")
	async proxyRecordsBase(@Req() req: FastifyRequest): Promise<unknown> {
		return this.proxyToDocumentService(req)
	}

	private async proxyToDocumentService(
		req: FastifyRequest,
	): Promise<unknown> {
		const url = req.url

		const headers: Record<string, string> = {}
		if (req.headers["x-user-id"]) {
			headers["x-user-id"] = req.headers["x-user-id"] as string
		}

		// Проверяем, является ли запрос multipart/form-data
		const contentType = req.headers["content-type"]
		const isMultipart = contentType?.includes("multipart/form-data")

		switch (req.method) {
			case "GET":
				return await this.httpClient.get("document", url, headers)
			case "POST":
				if (isMultipart) {
					console.log(
						"[DocumentProxy] Processing multipart request",
						{
							contentType,
							url,
						},
					)

					// Для multipart запросов просто проксируем raw body
					// Не используем req.file(), чтобы не парсить multipart дважды

					// Копируем заголовки включая Content-Type с оригинальным boundary
					const proxyHeaders = {
						...headers,
						"content-type": contentType!, // Сохраняем оригинальный Content-Type с boundary
					}

					console.log(
						"[DocumentProxy] Proxying raw multipart with headers:",
						proxyHeaders,
					)

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
