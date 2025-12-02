import {
	ExceptionFilter,
	Catch,
	ArgumentsHost,
	HttpException,
	HttpStatus,
	Logger,
} from "@nestjs/common"
import type { FastifyReply, FastifyRequest } from "fastify"

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
	private readonly logger = new Logger(AllExceptionsFilter.name)

	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp()
		const reply = ctx.getResponse<FastifyReply>()
		const request = ctx.getRequest<FastifyRequest>()

		let status = HttpStatus.INTERNAL_SERVER_ERROR
		let message: string | string[] = "Internal server error"
		let error = "Internal Server Error"

		if (exception instanceof HttpException) {
			status = exception.getStatus()
			const response = exception.getResponse()

			if (typeof response === "string") {
				message = response
			} else if (typeof response === "object" && response !== null) {
				message =
					(response as { message?: string | string[] }).message ||
					message
				error = (response as { error?: string }).error || error
			}
		} else if (exception instanceof Error) {
			message = exception.message
			error = exception.name
		}

		// Логируем ошибку
		this.logger.error(
			`${request.method} ${request.url} - ${status} ${error}: ${message}`,
			exception instanceof Error ? exception.stack : undefined,
		)

		// Отправляем response
		void reply.status(status).send({
			statusCode: status,
			timestamp: new Date().toISOString(),
			path: request.url,
			method: request.method,
			message,
			error,
		})
	}
}
