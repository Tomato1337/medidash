import { Test, TestingModule } from "@nestjs/testing"
import { describe, it, expect, beforeEach, vi } from "vitest"
import { TagsController } from "./tags.controller"
import { PrismaService } from "../prisma/prisma.service"

describe("TagsController", () => {
	let controller: TagsController

	const prismaMock = {
		tag: {
			findMany: vi.fn(),
		},
	}

	beforeEach(async () => {
		vi.clearAllMocks()

		const module: TestingModule = await Test.createTestingModule({
			controllers: [TagsController],
			providers: [
				{
					provide: PrismaService,
					useValue: prismaMock,
				},
			],
		}).compile()

		controller = module.get<TagsController>(TagsController)
	})

	it("should return all tags from prisma", async () => {
		// Arrange
		const tags = [
			{ id: "tag-1", name: "lab", count: 2 },
			{ id: "tag-2", name: "xray", count: 1 },
		]
		prismaMock.tag.findMany.mockResolvedValue(tags)

		// Act
		const result = await controller.getAllTags()

		// Assert
		expect(prismaMock.tag.findMany).toHaveBeenCalledTimes(1)
		expect(result).toEqual(tags)
	})
})
