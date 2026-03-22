import {
	CanActivate,
	ExecutionContext,
	Injectable,
	BadRequestException,
	OnModuleDestroy,
} from "@nestjs/common"
import Redis from "ioredis"
import { EnvService } from "src/env/env.service"

@Injectable()
export class SharedAccessVerifyGuard implements CanActivate, OnModuleDestroy {
	private redis: Redis
	private redisHost: string
	private redisPort: number

	constructor(private readonly envService: EnvService) {
		this.redisHost = this.envService.get("REDIS_HOST")
		this.redisPort = this.envService.get("REDIS_PORT")
		this.redis = new Redis({
			host: this.redisHost,
			port: this.redisPort,
		})
	}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest()
		const token = request.params?.token
		const ip = this.getRequestIp(request)
		if (!token || !ip) {
			return true
		}

		const key = `shared-access:verify:${token}:${ip}`
		const result = await this.redis
			.multi()
			.incr(key)
			.expire(key, 900)
			.exec()
		const count = Number(result?.[0]?.[1] ?? 0)
		if (count > 5) {
			throw new BadRequestException("Too many attempts")
		}
		return true
	}

	async onModuleDestroy() {
		await this.redis.quit()
	}

	private getRequestIp(request: any) {
		const forwardedFor = request.headers?.["x-forwarded-for"]
		if (typeof forwardedFor === "string") {
			return forwardedFor.split(",")[0].trim()
		}
		return request.ip || null
	}
}
