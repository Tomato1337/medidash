import { describe, it, expect, vi, beforeEach } from "vitest"
import {
	createSharedAccess,
	listSharedAccesses,
	revokeSharedAccess,
	listSharedAccessSessions,
	revokeSharedAccessSession,
	getSharedAccessInfo,
	verifySharedAccess,
	refreshSharedAccess,
} from "./sharedAccessApi"

vi.mock("@/shared/api/api", () => ({
	client: {
		GET: vi.fn(),
		POST: vi.fn(),
		DELETE: vi.fn(),
	},
}))

import { client } from "@/shared/api/api"

describe("sharedAccessApi", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe("createSharedAccess", () => {
		it("создаёт гостевой доступ", async () => {
			const mockData = {
				id: "sa-1",
				generatedPassword: "abc123",
			}
			vi.mocked(client.POST).mockResolvedValue({
				data: mockData,
				error: undefined,
			} as any)

			const result = await createSharedAccess({
				currentPassword: "pw",
				name: "Для врача",
				durationDays: 7,
			} as any)

			expect(client.POST).toHaveBeenCalledWith(
				"/api/shared-access",
				{
					body: {
						currentPassword: "pw",
						name: "Для врача",
						durationDays: 7,
					},
				},
			)
			expect(result).toEqual(mockData)
		})

		it("выбрасывает ошибку при наличии error", async () => {
			vi.mocked(client.POST).mockResolvedValue({
				data: undefined,
				error: { message: "Forbidden" },
			} as any)

			await expect(
				createSharedAccess({
					currentPassword: "pw",
					name: "Test",
					durationDays: 1,
				} as any),
			).rejects.toEqual({ message: "Forbidden" })
		})
	})

	describe("listSharedAccesses", () => {
		it("возвращает список доступов", async () => {
			const mockData = [{ id: "sa-1" }, { id: "sa-2" }]
			vi.mocked(client.GET).mockResolvedValue({
				data: mockData,
				error: undefined,
			} as any)

			const result = await listSharedAccesses()

			expect(client.GET).toHaveBeenCalledWith("/api/shared-access")
			expect(result).toEqual(mockData)
		})

		it("возвращает пустой массив если data null", async () => {
			vi.mocked(client.GET).mockResolvedValue({
				data: null,
				error: undefined,
			} as any)

			const result = await listSharedAccesses()

			expect(result).toEqual([])
		})
	})

	describe("revokeSharedAccess", () => {
		it("отзывает доступ по ID", async () => {
			vi.mocked(client.DELETE).mockResolvedValue({
				data: { message: "Revoked" },
				error: undefined,
			} as any)

			const result = await revokeSharedAccess("sa-1")

			expect(client.DELETE).toHaveBeenCalledWith(
				"/api/shared-access/{id}",
				{
					params: { path: { id: "sa-1" } },
				},
			)
			expect(result).toEqual({ message: "Revoked" })
		})
	})

	describe("listSharedAccessSessions", () => {
		it("возвращает список сессий доступа", async () => {
			const mockData = [{ id: "sess-1" }]
			vi.mocked(client.GET).mockResolvedValue({
				data: mockData,
				error: undefined,
			} as any)

			const result = await listSharedAccessSessions("sa-1")

			expect(client.GET).toHaveBeenCalledWith(
				"/api/shared-access/{id}/sessions",
				{
					params: { path: { id: "sa-1" } },
				},
			)
			expect(result).toEqual(mockData)
		})
	})

	describe("revokeSharedAccessSession", () => {
		it("отзывает конкретную сессию", async () => {
			vi.mocked(client.DELETE).mockResolvedValue({
				data: { message: "Session revoked" },
				error: undefined,
			} as any)

			const result = await revokeSharedAccessSession(
				"sa-1",
				"sess-1",
			)

			expect(client.DELETE).toHaveBeenCalledWith(
				"/api/shared-access/{id}/sessions/{sessionId}",
				{
					params: {
						path: { id: "sa-1", sessionId: "sess-1" },
					},
				},
			)
			expect(result).toEqual({ message: "Session revoked" })
		})
	})

	describe("getSharedAccessInfo", () => {
		it("возвращает публичную информацию о доступе", async () => {
			const mockData = {
				ownerName: "Иван",
				status: "active",
				ownerId: "u1",
			}
			vi.mocked(client.GET).mockResolvedValue({
				data: mockData,
				error: undefined,
			} as any)

			const result = await getSharedAccessInfo("token-1")

			expect(client.GET).toHaveBeenCalledWith(
				"/api/shared-access/{token}/info",
				{
					params: { path: { token: "token-1" } },
				},
			)
			expect(result).toEqual(mockData)
		})
	})

	describe("verifySharedAccess", () => {
		it("верифицирует пароль гостевого доступа", async () => {
			vi.mocked(client.POST).mockResolvedValue({
				data: { success: true },
				error: undefined,
			} as any)

			const result = await verifySharedAccess("token-1", {
				password: "pw",
			} as any)

			expect(client.POST).toHaveBeenCalledWith(
				"/api/shared-access/{token}/verify",
				{
					params: { path: { token: "token-1" } },
					body: { password: "pw" },
				},
			)
			expect(result).toEqual({ success: true })
		})
	})

	describe("refreshSharedAccess", () => {
		it("обновляет токен гостевого доступа", async () => {
			vi.mocked(client.POST).mockResolvedValue({
				data: { success: true },
				error: undefined,
			} as any)

			const result = await refreshSharedAccess("token-1")

			expect(client.POST).toHaveBeenCalledWith(
				"/api/shared-access/{token}/refresh",
				{
					params: { path: { token: "token-1" } },
				},
			)
			expect(result).toEqual({ success: true })
		})
	})
})
