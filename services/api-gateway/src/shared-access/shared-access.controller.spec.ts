import { Test, TestingModule } from "@nestjs/testing"
import { describe, it, expect, beforeEach, vi } from "vitest"
import { UnauthorizedException } from "@nestjs/common"
import { SharedAccessController } from "./shared-access.controller"
import { SharedAccessService } from "./shared-access.service"
import { HttpClientService } from "../common/http-client.service"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { SharedAccessVerifyGuard } from "./guards/shared-access-verify.guard"
import { SharedAccessAuthGuard } from "./guards/shared-access-auth.guard"
import { SharedAccessRefreshGuard } from "./guards/shared-access-refresh.guard"

describe("SharedAccessController", () => {
	let controller: SharedAccessController

	const mockSharedAccessService = {
		createSharedAccess: vi.fn(),
		listSharedAccesses: vi.fn(),
		revokeSharedAccess: vi.fn(),
		listSessions: vi.fn(),
		revokeSession: vi.fn(),
		getSharedAccessInfo: vi.fn(),
		verifySharedAccess: vi.fn(),
		refreshSharedAccess: vi.fn(),
	}

	const mockHttpClient = {
		get: vi.fn(),
	}

	const mockUser = {
		id: "u1",
		email: "user@example.com",
		name: "Иван",
		role: "USER",
		password: "hashed",
		createdAt: new Date(),
		updatedAt: new Date(),
	}

	beforeEach(async () => {
		vi.clearAllMocks()

		const mockGuard = { canActivate: vi.fn().mockReturnValue(true) }

		const module: TestingModule = await Test.createTestingModule({
			controllers: [SharedAccessController],
			providers: [
				{
					provide: SharedAccessService,
					useValue: mockSharedAccessService,
				},
				{ provide: HttpClientService, useValue: mockHttpClient },
			],
		})
			.overrideGuard(JwtAuthGuard)
			.useValue(mockGuard)
			.overrideGuard(SharedAccessVerifyGuard)
			.useValue(mockGuard)
			.overrideGuard(SharedAccessAuthGuard)
			.useValue(mockGuard)
			.overrideGuard(SharedAccessRefreshGuard)
			.useValue(mockGuard)
			.compile()

		controller = module.get<SharedAccessController>(
			SharedAccessController,
		)
	})

	it("делегирует createSharedAccess в сервис", async () => {
		const dto = {
			currentPassword: "pw",
			name: "Доступ",
			durationDays: 7,
		}
		const expected = { id: "sa-1", generatedPassword: "abc" }
		mockSharedAccessService.createSharedAccess.mockResolvedValue(expected)

		const result = await controller.createSharedAccess(
			mockUser as any,
			dto as any,
		)

		expect(
			mockSharedAccessService.createSharedAccess,
		).toHaveBeenCalledWith("u1", dto)
		expect(result).toEqual(expected)
	})

	it("делегирует listSharedAccesses в сервис", async () => {
		mockSharedAccessService.listSharedAccesses.mockResolvedValue([])

		const result = await controller.listSharedAccesses(mockUser as any)

		expect(
			mockSharedAccessService.listSharedAccesses,
		).toHaveBeenCalledWith("u1")
		expect(result).toEqual([])
	})

	it("делегирует revokeSharedAccess в сервис", async () => {
		mockSharedAccessService.revokeSharedAccess.mockResolvedValue({
			message: "Access revoked",
		})

		const result = await controller.revokeSharedAccess(
			mockUser as any,
			"sa-1",
		)

		expect(
			mockSharedAccessService.revokeSharedAccess,
		).toHaveBeenCalledWith("u1", "sa-1")
		expect(result).toEqual({ message: "Access revoked" })
	})

	it("делегирует listSessions в сервис", async () => {
		mockSharedAccessService.listSessions.mockResolvedValue([])

		const result = await controller.listSessions(
			mockUser as any,
			"sa-1",
		)

		expect(mockSharedAccessService.listSessions).toHaveBeenCalledWith(
			"u1",
			"sa-1",
		)
		expect(result).toEqual([])
	})

	it("делегирует revokeSession в сервис", async () => {
		mockSharedAccessService.revokeSession.mockResolvedValue({
			message: "Session revoked",
		})

		const result = await controller.revokeSession(
			mockUser as any,
			"sa-1",
			"sess-1",
		)

		expect(mockSharedAccessService.revokeSession).toHaveBeenCalledWith(
			"u1",
			"sa-1",
			"sess-1",
		)
		expect(result).toEqual({ message: "Session revoked" })
	})

	it("делегирует getSharedAccessInfo в сервис", async () => {
		const info = {
			ownerName: "Иван",
			status: "active",
			ownerId: "u1",
		}
		mockSharedAccessService.getSharedAccessInfo.mockResolvedValue(info)

		const result = await controller.getSharedAccessInfo("token-1")

		expect(
			mockSharedAccessService.getSharedAccessInfo,
		).toHaveBeenCalledWith("token-1")
		expect(result).toEqual(info)
	})

	it("делегирует verifySharedAccess в сервис", async () => {
		const req = { ip: "1.2.3.4" } as any
		const reply = { setCookie: vi.fn() } as any
		mockSharedAccessService.verifySharedAccess.mockResolvedValue({
			success: true,
		})

		const result = await controller.verifySharedAccess(
			"token-1",
			{ password: "pw" } as any,
			req,
			reply,
		)

		expect(
			mockSharedAccessService.verifySharedAccess,
		).toHaveBeenCalledWith(req, reply, "token-1", "pw")
		expect(result).toEqual({ success: true })
	})

	describe("refreshSharedAccess", () => {
		it("делегирует refresh в сервис", async () => {
			const req = {
				cookies: { SharedAccessRefresh: "refresh-tok" },
				user: { sharedAccessId: "sa-1", ownerId: "u1" },
			} as any
			const reply = {} as any
			mockSharedAccessService.refreshSharedAccess.mockResolvedValue({
				success: true,
			})

			const result = await controller.refreshSharedAccess(
				"token-1",
				req,
				reply,
			)

			expect(
				mockSharedAccessService.refreshSharedAccess,
			).toHaveBeenCalledWith(req, reply, "sa-1", "refresh-tok")
			expect(result).toEqual({ success: true })
		})

		it("выбрасывает UnauthorizedException если нет refresh cookie", async () => {
			const req = {
				cookies: {},
				user: { sharedAccessId: "sa-1", ownerId: "u1" },
			} as any
			const reply = {} as any

			await expect(
				controller.refreshSharedAccess("token-1", req, reply),
			).rejects.toThrow(UnauthorizedException)
		})

		it("выбрасывает UnauthorizedException если нет payload", async () => {
			const req = {
				cookies: { SharedAccessRefresh: "tok" },
				user: null,
			} as any
			const reply = {} as any

			await expect(
				controller.refreshSharedAccess("token-1", req, reply),
			).rejects.toThrow(UnauthorizedException)
		})
	})

	describe("guest proxy endpoints", () => {
		it("proxyRecords делегирует GET к document-service", async () => {
			const req = {
				url: "/shared-access/tok123/records",
				user: { ownerId: "u1" },
			} as any
			mockHttpClient.get.mockResolvedValue([{ id: "r1" }])

			const result = await controller.proxyRecords(req, "tok123")

			expect(mockHttpClient.get).toHaveBeenCalledWith(
				"document",
				"/api/records",
				{ "x-user-id": "u1" },
			)
			expect(result).toEqual([{ id: "r1" }])
		})

		it("proxyRecordById делегирует GET конкретной записи", async () => {
			const req = {
				url: "/shared-access/tok123/records/r1",
				user: { ownerId: "u1" },
			} as any
			mockHttpClient.get.mockResolvedValue({ id: "r1" })

			const result = await controller.proxyRecordById(req, "tok123")

			expect(mockHttpClient.get).toHaveBeenCalledWith(
				"document",
				"/api/records/r1",
				{ "x-user-id": "u1" },
			)
			expect(result).toEqual({ id: "r1" })
		})

		it("proxyDocumentDownloadUrl делегирует GET download URL", async () => {
			const req = {
				url: "/shared-access/tok123/documents/d1/download-url",
				user: { ownerId: "u1" },
			} as any
			mockHttpClient.get.mockResolvedValue({ url: "http://..." })

			const result = await controller.proxyDocumentDownloadUrl(
				req,
				"tok123",
			)

			expect(mockHttpClient.get).toHaveBeenCalledWith(
				"document",
				"/api/documents/d1/download-url",
				{ "x-user-id": "u1" },
			)
			expect(result).toEqual({ url: "http://..." })
		})

		it("proxyTags делегирует GET тегов", async () => {
			const req = {
				url: "/shared-access/tok123/tags",
				user: { ownerId: "u1" },
			} as any
			mockHttpClient.get.mockResolvedValue([{ id: "t1" }])

			const result = await controller.proxyTags(req, "tok123")

			expect(mockHttpClient.get).toHaveBeenCalledWith(
				"document",
				"/api/tags",
				{ "x-user-id": "u1" },
			)
			expect(result).toEqual([{ id: "t1" }])
		})
	})
})
