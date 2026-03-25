import { describe, it, expect, beforeEach, vi } from "vitest"
import { UnauthorizedException } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"
import { SharedAccessJwtRefreshStrategy } from "./shared-access-jwt-refresh.strategy"
import { EnvService } from "../../env/env.service"
import { SharedAccessService } from "../shared-access.service"

describe("SharedAccessJwtRefreshStrategy", () => {
	let strategy: SharedAccessJwtRefreshStrategy

	const mockEnvService = {
		get: vi.fn((key: string) => {
			const map: Record<string, string> = {
				JWT_SHARED_ACCESS_REFRESH_SECRET: "test-refresh-secret",
			}
			return map[key]
		}),
	}

	const mockSharedAccessService = {
		validateRefreshToken: vi.fn(),
	}

	beforeEach(async () => {
		vi.clearAllMocks()

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				SharedAccessJwtRefreshStrategy,
				{ provide: EnvService, useValue: mockEnvService },
				{
					provide: SharedAccessService,
					useValue: mockSharedAccessService,
				},
			],
		}).compile()

		strategy = module.get<SharedAccessJwtRefreshStrategy>(
			SharedAccessJwtRefreshStrategy,
		)
	})

	it("делегирует validateRefreshToken в SharedAccessService", async () => {
		const request = {
			cookies: { SharedAccessRefresh: "raw-refresh-token" },
		}
		const payload = {
			sharedAccessId: "sa-1",
			ownerId: "owner-1",
			type: "shared-access-refresh" as const,
		}
		mockSharedAccessService.validateRefreshToken.mockResolvedValue({
			sharedAccessId: "sa-1",
			ownerId: "owner-1",
		})

		const result = await strategy.validate(request as any, payload)

		expect(
			mockSharedAccessService.validateRefreshToken,
		).toHaveBeenCalledWith("sa-1", "raw-refresh-token")
		expect(result).toEqual({
			sharedAccessId: "sa-1",
			ownerId: "owner-1",
		})
	})

	it("выбрасывает UnauthorizedException если нет cookie", async () => {
		const request = { cookies: {} }
		const payload = {
			sharedAccessId: "sa-1",
			ownerId: "owner-1",
			type: "shared-access-refresh" as const,
		}

		await expect(
			strategy.validate(request as any, payload),
		).rejects.toThrow(UnauthorizedException)
	})
})
