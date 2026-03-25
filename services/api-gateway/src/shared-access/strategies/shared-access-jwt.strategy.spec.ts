import { describe, it, expect, beforeEach, vi } from "vitest"
import { ForbiddenException } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"
import { SharedAccessJwtStrategy } from "./shared-access-jwt.strategy"
import { EnvService } from "../../env/env.service"
import { PrismaService } from "../../prisma.service"

describe("SharedAccessJwtStrategy", () => {
	let strategy: SharedAccessJwtStrategy

	const mockEnvService = {
		get: vi.fn((key: string) => {
			const map: Record<string, string> = {
				JWT_SHARED_ACCESS_SECRET: "test-shared-secret",
			}
			return map[key]
		}),
	}

	const mockPrisma = {
		sharedAccess: {
			findUnique: vi.fn(),
		},
	}

	beforeEach(async () => {
		vi.clearAllMocks()

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				SharedAccessJwtStrategy,
				{ provide: EnvService, useValue: mockEnvService },
				{ provide: PrismaService, useValue: mockPrisma },
			],
		}).compile()

		strategy =
			module.get<SharedAccessJwtStrategy>(SharedAccessJwtStrategy)
	})

	it("возвращает payload если доступ ACTIVE и не истёк", async () => {
		const futureDate = new Date(Date.now() + 86400000)
		mockPrisma.sharedAccess.findUnique.mockResolvedValue({
			id: "sa-1",
			status: "ACTIVE",
			expiresAt: futureDate,
			userId: "owner-1",
		})

		const result = await strategy.validate({
			sharedAccessId: "sa-1",
			ownerId: "owner-1",
			type: "shared-access",
		})

		expect(result).toEqual({
			sharedAccessId: "sa-1",
			ownerId: "owner-1",
		})
	})

	it("выбрасывает ForbiddenException если доступ не найден", async () => {
		mockPrisma.sharedAccess.findUnique.mockResolvedValue(null)

		await expect(
			strategy.validate({
				sharedAccessId: "sa-x",
				ownerId: "o",
				type: "shared-access",
			}),
		).rejects.toThrow(ForbiddenException)
	})

	it("выбрасывает ForbiddenException если статус не ACTIVE", async () => {
		mockPrisma.sharedAccess.findUnique.mockResolvedValue({
			id: "sa-1",
			status: "REVOKED",
			expiresAt: new Date(Date.now() + 86400000),
		})

		await expect(
			strategy.validate({
				sharedAccessId: "sa-1",
				ownerId: "o",
				type: "shared-access",
			}),
		).rejects.toThrow(ForbiddenException)
	})

	it("выбрасывает ForbiddenException если доступ истёк", async () => {
		mockPrisma.sharedAccess.findUnique.mockResolvedValue({
			id: "sa-1",
			status: "ACTIVE",
			expiresAt: new Date(Date.now() - 1000),
		})

		await expect(
			strategy.validate({
				sharedAccessId: "sa-1",
				ownerId: "o",
				type: "shared-access",
			}),
		).rejects.toThrow(ForbiddenException)
	})
})
