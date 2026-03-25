import { describe, it, expect, beforeEach, vi } from "vitest"
import { BadRequestException } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"
import { SharedAccessVerifyGuard } from "./shared-access-verify.guard"
import { EnvService } from "../../env/env.service"

// Мокаем ioredis — конструктор через function(), не стрелочную
const redisInstance = {
	multi: vi.fn(),
	quit: vi.fn().mockResolvedValue("OK"),
}

vi.mock("ioredis", () => ({
	default: vi.fn(function (this: any) {
		Object.assign(this, redisInstance)
	}),
}))

describe("SharedAccessVerifyGuard", () => {
	let guard: SharedAccessVerifyGuard

	const mockEnvService = {
		get: vi.fn((key: string) => {
			const map: Record<string, unknown> = {
				REDIS_HOST: "localhost",
				REDIS_PORT: 6379,
			}
			return map[key]
		}),
	}

	const createContext = (token?: string, ip?: string) => ({
		switchToHttp: () => ({
			getRequest: () => ({
				params: { token },
				ip,
				headers: {},
			}),
		}),
	})

	beforeEach(async () => {
		vi.clearAllMocks()

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				SharedAccessVerifyGuard,
				{ provide: EnvService, useValue: mockEnvService },
			],
		}).compile()

		guard = module.get<SharedAccessVerifyGuard>(SharedAccessVerifyGuard)
	})

	it("пропускает запрос если count <= 5", async () => {
		const execResult = [[null, 3]]
		redisInstance.multi.mockReturnValue({
			incr: vi.fn().mockReturnThis(),
			expire: vi.fn().mockReturnThis(),
			exec: vi.fn().mockResolvedValue(execResult),
		})

		const result = await guard.canActivate(
			createContext("token-1", "1.2.3.4") as any,
		)

		expect(result).toBe(true)
	})

	it("выбрасывает BadRequestException если count > 5", async () => {
		const execResult = [[null, 6]]
		redisInstance.multi.mockReturnValue({
			incr: vi.fn().mockReturnThis(),
			expire: vi.fn().mockReturnThis(),
			exec: vi.fn().mockResolvedValue(execResult),
		})

		await expect(
			guard.canActivate(createContext("token-1", "1.2.3.4") as any),
		).rejects.toThrow(BadRequestException)
	})

	it("пропускает если нет token или ip", async () => {
		const result = await guard.canActivate(
			createContext(undefined, undefined) as any,
		)

		expect(result).toBe(true)
		expect(redisInstance.multi).not.toHaveBeenCalled()
	})

	it("извлекает IP из x-forwarded-for", async () => {
		const execResult = [[null, 1]]
		redisInstance.multi.mockReturnValue({
			incr: vi.fn().mockReturnThis(),
			expire: vi.fn().mockReturnThis(),
			exec: vi.fn().mockResolvedValue(execResult),
		})

		const context = {
			switchToHttp: () => ({
				getRequest: () => ({
					params: { token: "tok" },
					ip: "fallback-ip",
					headers: {
						"x-forwarded-for": "10.0.0.1, 10.0.0.2",
					},
				}),
			}),
		}

		const result = await guard.canActivate(context as any)

		expect(result).toBe(true)
	})

	it("onModuleDestroy закрывает Redis", async () => {
		await guard.onModuleDestroy()

		expect(redisInstance.quit).toHaveBeenCalled()
	})
})
