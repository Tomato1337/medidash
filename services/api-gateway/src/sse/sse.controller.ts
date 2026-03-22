import { Controller, Get, Param, Req, Res, UseGuards } from "@nestjs/common"
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger"
import type { FastifyRequest, FastifyReply } from "fastify"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { SseService } from "./sse.service"
import { randomUUID } from "crypto"

// interface RequestWithUser extends FastifyRequest {
// 	user: {
// 		id: string
// 		email: string
// 	}
// }

@ApiTags("SSE Events")
@Controller("events")
export class SseController {
	constructor(private readonly sseService: SseService) {}

	@Get("processing")
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({
		summary:
			"Подключение к SSE для получения событий обработки всех документов пользователя",
		description:
			"Устанавливает Server-Sent Events соединение для получения real-time уведомлений о статусе обработки документов. " +
			"Клиент будет получать события: processing:started, processing:progress, processing:completed, processing:failed",
	})
	streamAllProcessingEvents(
		@Param() _params: unknown,
		@Res() reply: FastifyReply,
		@Req() request: FastifyRequest,
	): void {
		const userId = request.user?.id
		const clientId = randomUUID()
		this.sseService.addClient(clientId, userId, reply.raw)
	}

	@Get("processing/:recordId")
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({
		summary:
			"Подключение к SSE для получения событий обработки конкретного record",
		description:
			"Устанавливает Server-Sent Events соединение для получения real-time уведомлений о статусе обработки конкретного record. " +
			"Клиент будет получать события только для указанного recordId.",
	})
	@ApiParam({
		name: "recordId",
		description: "ID record для отслеживания",
		example: "cm2u1234567890abcdef",
	})
	streamRecordProcessingEvents(
		@Param("recordId") recordId: string,
		@Res() reply: FastifyReply,
		@Req() request: FastifyRequest,
	): void {
		const userId = request.user?.id
		const clientId = randomUUID()

		this.sseService.addClient(clientId, userId, reply.raw, recordId)
	}

	@Get("stats")
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({
		summary: "Получить статистику активных SSE подключений",
		description:
			"Возвращает информацию о количестве активных SSE клиентов (только для администраторов)",
	})
	getStats() {
		return {
			activeClients: this.sseService.getActiveClientsCount(),
			clients: this.sseService.getActiveClients(),
		}
	}
}
