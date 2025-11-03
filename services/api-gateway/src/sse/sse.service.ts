import {
	Injectable,
	Logger,
	OnModuleInit,
	OnModuleDestroy,
} from "@nestjs/common"
import type { ServerResponse } from "http"
import Redis from "ioredis"
import { EnvService } from "../env/env.service"
import z from "zod"

const processingEventSchema = z.object({
	recordId: z.string(),
	userId: z.string(),
	type: z.enum(["started", "progress", "completed", "failed"]),
	data: z.record(z.string(), z.unknown()),
	timestamp: z.string().optional(),
})
type ProcessingEvent = z.infer<typeof processingEventSchema>

interface SseClient {
	id: string
	userId: string
	response: ServerResponse
	recordId?: string
}

@Injectable()
export class SseService implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(SseService.name)
	private readonly clients = new Map<string, SseClient>()
	private redisSubscriber: Redis
	private redisPublisher: Redis

	constructor(private readonly envService: EnvService) {}

	async onModuleInit() {
		const redisConfig = {
			host: this.envService.get("REDIS_HOST"),
			port: this.envService.get("REDIS_PORT"),
		}

		this.redisSubscriber = new Redis(redisConfig)
		this.redisPublisher = new Redis(redisConfig)

		// Подписываемся на канал событий обработки
		await this.redisSubscriber.subscribe("processing:events")

		this.redisSubscriber.on("message", (channel, message) => {
			if (channel === "processing:events") {
				try {
					const event = JSON.parse(message) as unknown
					const parsedEvent = z.parse(processingEventSchema, event)
					this.handleProcessingEvent(parsedEvent)
				} catch (error) {
					const errorMessage =
						error instanceof Error ? error.message : "Unknown error"
					this.logger.error(`Failed to parse event: ${errorMessage}`)
				}
			}
		})

		this.logger.log(
			"SSE Service initialized and subscribed to Redis events",
		)
	}

	async onModuleDestroy() {
		for (const client of this.clients.values()) {
			client.response.end()
		}
		this.clients.clear()

		await this.redisSubscriber.quit()
		await this.redisPublisher.quit()

		this.logger.log("SSE Service destroyed")
	}

	/**
	 * Добавляет клиента для получения SSE событий
	 */
	addClient(
		clientId: string,
		userId: string,
		response: ServerResponse,
		recordId?: string,
	) {
		// Настраиваем заголовки для SSE
		response.setHeader("Content-Type", "text/event-stream")
		response.setHeader("Cache-Control", "no-cache")
		response.setHeader("Connection", "keep-alive")
		response.setHeader("X-Accel-Buffering", "no") // Для nginx

		// Отправляем начальное сообщение
		this.sendEvent(response, "connected", {
			clientId,
			timestamp: new Date().toISOString(),
		})

		// Сохраняем клиента
		this.clients.set(clientId, { id: clientId, userId, response, recordId })

		this.logger.log(
			`Client ${clientId} connected (userId: ${userId}, recordId: ${recordId || "all"})`,
		)

		// Отправляем heartbeat каждые 30 секунд
		const heartbeatInterval = setInterval(() => {
			if (!this.clients.has(clientId)) {
				clearInterval(heartbeatInterval)
				return
			}
			this.sendEvent(response, "heartbeat", {
				timestamp: new Date().toISOString(),
			})
		}, 30000)

		// Обрабатываем отключение клиента
		response.on("close", () => {
			clearInterval(heartbeatInterval)
			this.clients.delete(clientId)
			this.logger.log(`Client ${clientId} disconnected`)
		})
	}

	/**
	 * Отправляет событие конкретному клиенту
	 */
	private sendEvent(
		response: ServerResponse,
		event: string,
		data: Record<string, unknown>,
	) {
		try {
			response.write(`event: ${event}\n`)
			response.write(`data: ${JSON.stringify(data)}\n\n`)
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error"
			this.logger.error(`Failed to send event: ${errorMessage}`)
		}
	}

	/**
	 * Обрабатывает события обработки из Redis
	 */
	private handleProcessingEvent(event: ProcessingEvent) {
		this.logger.debug(
			`Processing event: ${event.type} for record ${event.recordId}`,
		)

		// Отправляем событие всем заинтересованным клиентам
		for (const client of this.clients.values()) {
			// Проверяем, что клиент подписан на события этого пользователя
			if (client.userId !== event.userId) {
				continue
			}

			// Проверяем, что клиент подписан на события этого record (или на все)
			if (client.recordId && client.recordId !== event.recordId) {
				continue
			}

			this.sendEvent(client.response, `processing:${event.type}`, {
				recordId: event.recordId,
				...event.data,
			})
		}
	}

	/**
	 * Публикует событие обработки в Redis (для использования микросервисами)
	 */
	async publishProcessingEvent(
		recordId: string,
		userId: string,
		type: "started" | "progress" | "completed" | "failed",
		data: any,
	) {
		const event = {
			recordId,
			userId,
			type,
			data,
			timestamp: new Date().toISOString(),
		}

		await this.redisPublisher.publish(
			"processing:events",
			JSON.stringify(event),
		)
		this.logger.debug(`Published ${type} event for record ${recordId}`)
	}

	/**
	 * Возвращает количество активных клиентов
	 */
	getActiveClientsCount(): number {
		return this.clients.size
	}

	/**
	 * Возвращает информацию об активных клиентах (для мониторинга)
	 */
	getActiveClients(): Array<{
		id: string
		userId: string
		recordId?: string
	}> {
		return Array.from(this.clients.values()).map((client) => ({
			id: client.id,
			userId: client.userId,
			recordId: client.recordId,
		}))
	}
}
