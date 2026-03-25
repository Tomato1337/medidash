import { Test, TestingModule } from "@nestjs/testing"
import { describe, it, expect, beforeEach, vi } from "vitest"
import { SharedAccessCleanupService } from "./shared-access-cleanup.service"
import { PrismaService } from "../prisma.service"

describe("SharedAccessCleanupService", () => {
	let service: SharedAccessCleanupService

	const mockPrisma = {
		sharedAccessRefreshToken: {
			deleteMany: vi.fn().mockResolvedValue({ count: 5 }),
		},
		sharedAccess: {
			updateMany: vi.fn().mockResolvedValue({ count: 2 }),
		},
		sharedAccessLog: {
			deleteMany: vi.fn().mockResolvedValue({ count: 10 }),
		},
	}

	beforeEach(async () => {
		vi.clearAllMocks()

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				SharedAccessCleanupService,
				{ provide: PrismaService, useValue: mockPrisma },
			],
		}).compile()

		service = module.get<SharedAccessCleanupService>(
			SharedAccessCleanupService,
		)
	})

	it("удаляет истёкшие токены", async () => {
		await service.cleanupExpiredData()

		expect(
			mockPrisma.sharedAccessRefreshToken.deleteMany,
		).toHaveBeenCalledWith({
			where: { expiresAt: { lt: expect.any(Date) } },
		})
	})

	it("помечает истёкшие доступы как EXPIRED", async () => {
		await service.cleanupExpiredData()

		expect(mockPrisma.sharedAccess.updateMany).toHaveBeenCalledWith({
			where: {
				status: "ACTIVE",
				expiresAt: { lt: expect.any(Date) },
			},
			data: { status: "EXPIRED" },
		})
	})

	it("удаляет логи старше 90 дней", async () => {
		await service.cleanupExpiredData()

		expect(
			mockPrisma.sharedAccessLog.deleteMany,
		).toHaveBeenCalledWith({
			where: { createdAt: { lt: expect.any(Date) } },
		})
	})
})
