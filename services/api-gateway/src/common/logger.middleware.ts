import { Injectable, NestMiddleware, Logger } from "@nestjs/common"
import type { FastifyRequest, FastifyReply } from "fastify"

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
	private readonly logger = new Logger("HTTP")

	use(
		req: FastifyRequest["raw"],
		res: FastifyReply["raw"],
		next: () => void,
	) {
		const { method, url } = req
		const startTime = Date.now()

		res.on("finish", () => {
			const duration = Date.now() - startTime
			const { statusCode } = res

			const logMessage = `${method} ${url} - ${statusCode} - ${duration}ms`

			if (statusCode >= 500) {
				this.logger.error(logMessage)
			} else if (statusCode >= 400) {
				this.logger.warn(logMessage)
			} else {
				this.logger.log(logMessage)
			}
		})

		next()
	}
}
