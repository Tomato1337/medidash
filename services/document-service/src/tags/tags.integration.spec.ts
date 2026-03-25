import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest"
import { Test } from "@nestjs/testing"
import {
	FastifyAdapter,
	NestFastifyApplication,
} from "@nestjs/platform-fastify"
import { ValidationPipe } from "@nestjs/common"
import request from "supertest"
import { TagsController } from "./tags.controller"
import { PrismaService } from "../prisma/prisma.service"

describe("TagsController (integration)", () => {
	let app: NestFastifyApplication

	const mockPrisma = {
		tag: {
			findMany: vi.fn(),
		},
	}

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			controllers: [TagsController],
			providers: [{ provide: PrismaService, useValue: mockPrisma }],
		}).compile()

		app = moduleRef.createNestApplication<NestFastifyApplication>(
			new FastifyAdapter(),
		)
		app.setGlobalPrefix("api")
		app.useGlobalPipes(
			new ValidationPipe({
				whitelist: true,
				transform: true,
				forbidNonWhitelisted: true,
			}),
		)
		await app.init()
		await app.getHttpAdapter().getInstance().ready()
	})

	afterAll(async () => {
		await app.close()
	})

	beforeEach(() => {
		vi.resetAllMocks()
	})

	describe("GET /api/tags", () => {
		it("должен вернуть список тегов", async () => {
			const mockTags = [
				{
					id: "tag-1",
					name: "Анализы",
					description: "Результаты лабораторных анализов",
					color: "#3B82F6",
					isSystem: true,
					createdAt: new Date("2025-01-01"),
					updatedAt: new Date("2025-01-01"),
				},
				{
					id: "tag-2",
					name: "Рецепты",
					description: null,
					color: null,
					isSystem: false,
					createdAt: new Date("2025-02-01"),
					updatedAt: new Date("2025-02-01"),
				},
			]
			mockPrisma.tag.findMany.mockResolvedValue(mockTags)

			const response = await request(app.getHttpServer())
				.get("/api/tags")
				.expect(200)

			expect(response.body).toHaveLength(2)
			expect(response.body[0].name).toBe("Анализы")
			expect(response.body[1].name).toBe("Рецепты")
			expect(mockPrisma.tag.findMany).toHaveBeenCalledOnce()
		})

		it("должен вернуть пустой массив когда тегов нет", async () => {
			mockPrisma.tag.findMany.mockResolvedValue([])

			const response = await request(app.getHttpServer())
				.get("/api/tags")
				.expect(200)

			expect(response.body).toEqual([])
			expect(mockPrisma.tag.findMany).toHaveBeenCalledOnce()
		})

		it("должен вернуть теги со всеми полями", async () => {
			const tag = {
				id: "tag-1",
				name: "Анализы",
				description: "Описание",
				color: "#FF0000",
				isSystem: true,
				createdAt: new Date("2025-01-01T00:00:00.000Z"),
				updatedAt: new Date("2025-01-02T00:00:00.000Z"),
			}
			mockPrisma.tag.findMany.mockResolvedValue([tag])

			const response = await request(app.getHttpServer())
				.get("/api/tags")
				.expect(200)

			expect(response.body[0]).toMatchObject({
				id: "tag-1",
				name: "Анализы",
				description: "Описание",
				color: "#FF0000",
				isSystem: true,
			})
		})
	})
})
