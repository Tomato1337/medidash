import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Post,
	Req,
	Res,
	UseGuards,
	UnauthorizedException,
} from "@nestjs/common"
import {
	ApiBearerAuth,
	ApiOperation,
	ApiResponse,
	ApiTags,
} from "@nestjs/swagger"
import type { FastifyReply, FastifyRequest } from "fastify"
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard"
import { Public } from "src/auth/decorators/public.decorator"
import { CurrentUser } from "src/auth/decorators/current-user.decorator"
import type { User } from "generated/prisma"
import {
	CreateSharedAccessDto,
	CreateSharedAccessResponseDto,
	SharedAccessResponseDto,
	SharedAccessSessionResponseDto,
	VerifySharedAccessDto,
	SharedAccessInfoResponseDto,
} from "./dto/shared-access.dto"
import { SharedAccessService } from "./shared-access.service"
import { SharedAccessAuthGuard } from "./guards/shared-access-auth.guard"
import { SharedAccessRefreshGuard } from "./guards/shared-access-refresh.guard"
import { HttpClientService } from "src/common/http-client.service"
import { SharedAccessVerifyGuard } from "./guards/shared-access-verify.guard"

@ApiTags("Shared Access")
@Controller("shared-access")
export class SharedAccessController {
	constructor(
		private readonly sharedAccessService: SharedAccessService,
		private readonly httpClient: HttpClientService,
	) {}

	@Post()
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: "Создать гостевой доступ" })
	@ApiResponse({ status: 201, type: CreateSharedAccessResponseDto })
	async createSharedAccess(
		@CurrentUser() user: User,
		@Body() body: CreateSharedAccessDto,
	): Promise<CreateSharedAccessResponseDto> {
		return this.sharedAccessService.createSharedAccess(user.id, body)
	}

	@Get()
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: "Список гостевых доступов" })
	@ApiResponse({ status: 200, type: [SharedAccessResponseDto] })
	async listSharedAccesses(
		@CurrentUser() user: User,
	): Promise<SharedAccessResponseDto[]> {
		return this.sharedAccessService.listSharedAccesses(user.id)
	}

	@Delete(":id")
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: "Отозвать доступ полностью" })
	async revokeSharedAccess(
		@CurrentUser() user: User,
		@Param("id") id: string,
	) {
		return this.sharedAccessService.revokeSharedAccess(user.id, id)
	}

	@Get(":id/sessions")
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: "Список активных сессий доступа" })
	@ApiResponse({ status: 200, type: [SharedAccessSessionResponseDto] })
	async listSessions(
		@CurrentUser() user: User,
		@Param("id") id: string,
	): Promise<SharedAccessSessionResponseDto[]> {
		return this.sharedAccessService.listSessions(user.id, id)
	}

	@Delete(":id/sessions/:sessionId")
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: "Отозвать конкретную сессию" })
	async revokeSession(
		@CurrentUser() user: User,
		@Param("id") id: string,
		@Param("sessionId") sessionId: string,
	) {
		return this.sharedAccessService.revokeSession(user.id, id, sessionId)
	}

	@Get(":token/info")
	@Public()
	@ApiOperation({ summary: "Публичная информация о доступе" })
	@ApiResponse({ status: 200, type: SharedAccessInfoResponseDto })
	async getSharedAccessInfo(
		@Param("token") token: string,
	): Promise<SharedAccessInfoResponseDto> {
		return this.sharedAccessService.getSharedAccessInfo(token)
	}

	@Post(":token/verify")
	@Public()
	@UseGuards(SharedAccessVerifyGuard)
	@ApiOperation({ summary: "Проверка пароля и выдача гостевых токенов" })
	@ApiResponse({ status: 200, description: "Успешная верификация" })
	async verifySharedAccess(
		@Param("token") token: string,
		@Body() body: VerifySharedAccessDto,
		@Req() request: FastifyRequest,
		@Res({ passthrough: true }) reply: FastifyReply,
	) {
		return this.sharedAccessService.verifySharedAccess(
			request,
			reply,
			token,
			body.password,
		)
	}

	@Post(":token/refresh")
	@UseGuards(SharedAccessRefreshGuard)
	@ApiOperation({ summary: "Обновление гостевого access токена" })
	@ApiResponse({ status: 200, description: "Токен обновлён" })
	async refreshSharedAccess(
		@Param("token") _token: string,
		@Req() request: FastifyRequest,
		@Res({ passthrough: true }) reply: FastifyReply,
	) {
		const refreshToken = request.cookies?.SharedAccessRefresh as string
		const payload = (request as any).user as {
			sharedAccessId: string
			ownerId: string
		}
		if (!refreshToken || !payload?.sharedAccessId) {
			throw new UnauthorizedException("Refresh token not found")
		}
		return this.sharedAccessService.refreshSharedAccess(
			request,
			reply,
			payload.sharedAccessId,
			refreshToken,
		)
	}

	@Get(":token/records")
	@UseGuards(SharedAccessAuthGuard)
	@ApiOperation({ summary: "Список записей владельца (гостевой доступ)" })
	async proxyRecords(
		@Req() request: FastifyRequest,
		@Param("token") token: string,
	) {
		const payload = (request as any).user as { ownerId: string }
		const headers: Record<string, string> = {
			"x-user-id": payload.ownerId,
		}
		const path = this.mapDocumentServicePath(request.url, token)
		return this.httpClient.get("document", path, headers)
	}

	@Get(":token/records/:recordId")
	@UseGuards(SharedAccessAuthGuard)
	@ApiOperation({ summary: "Детали записи владельца (гостевой доступ)" })
	async proxyRecordById(
		@Req() request: FastifyRequest,
		@Param("token") token: string,
	) {
		const payload = (request as any).user as { ownerId: string }
		const headers: Record<string, string> = {
			"x-user-id": payload.ownerId,
		}
		const path = this.mapDocumentServicePath(request.url, token)
		return this.httpClient.get("document", path, headers)
	}

	@Get(":token/documents/:documentId/download-url")
	@UseGuards(SharedAccessAuthGuard)
	@ApiOperation({ summary: "Получить ссылку для скачивания документа (гостевой доступ)" })
	async proxyDocumentDownloadUrl(
		@Req() request: FastifyRequest,
		@Param("token") token: string,
	) {
		const payload = (request as any).user as { ownerId: string }
		const headers: Record<string, string> = {
			"x-user-id": payload.ownerId,
		}
		const path = this.mapDocumentServicePath(request.url, token)
		return this.httpClient.get("document", path, headers)
	}

	@Get(":token/tags")
	@UseGuards(SharedAccessAuthGuard)
	@ApiOperation({ summary: "Список тегов (гостевой доступ)" })
	async proxyTags(
		@Req() request: FastifyRequest,
		@Param("token") token: string,
	) {
		const payload = (request as any).user as { ownerId: string }
		const headers: Record<string, string> = {
			"x-user-id": payload.ownerId,
		}
		const path = this.mapDocumentServicePath(request.url, token)
		return this.httpClient.get("document", path, headers)
	}

	private mapDocumentServicePath(url: string, token: string) {
		const pathWithPrefix = url.replace(`/shared-access/${token}`, "")
		return pathWithPrefix.startsWith("/api/")
			? pathWithPrefix
			: `/api${pathWithPrefix}`
	}
}
