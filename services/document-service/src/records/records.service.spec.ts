import { Test, TestingModule } from "@nestjs/testing"
import { HttpException, NotFoundException } from "@nestjs/common"
import { describe, it, expect, beforeEach, vi } from "vitest"
import { DocumentStatus } from "@shared-types"
import { RecordsService } from "./records.service"
import { PrismaService } from "../prisma/prisma.service"
import {
	CreateRecordDto,
	UpdateRecordDto,
} from "./dto/record.dto"
import {
	GetRecordsQueryDto,
	RecordSortBy,
	SortDirection,
} from "./dto/get-records-query.dto"

const createRecordFixture = (overrides: Record<string, unknown> = {}) => ({
	id: "record-1",
	userId: "user-1",
	title: "Record title",
	description: "Record description",
	date: new Date("2024-01-15T00:00:00.000Z"),
	summary: null,
	createdAt: new Date("2024-01-15T10:00:00.000Z"),
	updatedAt: new Date("2024-01-15T10:00:00.000Z"),
	deletedAt: null,
	tags: [
		{
			tag: {
				id: "tag-1",
				name: "lab",
			},
		},
	],
	documents: [
		{
			id: "doc-1",
			status: DocumentStatus.COMPLETED,
			failedPhase: null,
			fileSize: 123,
			fileName: "file.pdf",
			originalFileName: "file-original.pdf",
		},
	],
	_count: {
		documents: 1,
	},
	...overrides,
})

describe("RecordsService", () => {
	let service: RecordsService

	const prismaMock = {
		record: {
			findUnique: vi.fn(),
			create: vi.fn(),
			findMany: vi.fn(),
			count: vi.fn(),
			findFirst: vi.fn(),
			update: vi.fn(),
		},
		recordTag: {
			deleteMany: vi.fn(),
		},
	}

	beforeEach(async () => {
		vi.clearAllMocks()

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				RecordsService,
				{
					provide: PrismaService,
					useValue: prismaMock,
				},
			],
		}).compile()

		service = module.get<RecordsService>(RecordsService)
	})

	describe("createRecord", () => {
		it("should create record for user", async () => {
			// Arrange
			const dto: CreateRecordDto = {
				recordId: "record-1",
				title: "Новая запись",
				description: "Описание",
				tags: ["tag-1", "tag-2"],
				date: "2024-01-15T00:00:00.000Z",
			}

			prismaMock.record.findUnique.mockResolvedValue(null)
			prismaMock.record.create.mockResolvedValue(createRecordFixture())

			// Act
			const result = await service.createRecord("user-1", dto)

			// Assert
			expect(prismaMock.record.findUnique).toHaveBeenCalledWith({
				where: { id: dto.recordId },
			})
			expect(prismaMock.record.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						userId: "user-1",
						id: dto.recordId,
						title: dto.title,
					}),
				}),
			)
			expect(result.id).toBe("record-1")
			expect(result.userId).toBe("user-1")
		})

		it("should throw conflict when record already exists", async () => {
			// Arrange
			prismaMock.record.findUnique.mockResolvedValue({ id: "record-1" })

			// Act
			const call = service.createRecord("user-1", {
				recordId: "record-1",
				title: "Дубликат",
			})

			// Assert
			await expect(call).rejects.toThrow(HttpException)
			await expect(call).rejects.toMatchObject({
				status: 409,
			})
		})
	})

	describe("getUserRecords", () => {
		it("should return paginated records and build filter where clause", async () => {
			// Arrange
			const query = new GetRecordsQueryDto()
			query.page = 2
			query.limit = 5
			query.sortBy = RecordSortBy.TITLE
			query.sortDir = SortDirection.ASC
			query.tags = "tag-1, tag-2"
			query.status = "COMPLETED,FAILED,INVALID"
			query.search = "анализ"
			query.dateFrom = "2024-01-01T00:00:00.000Z"
			query.dateTo = "2024-01-31T00:00:00.000Z"

			prismaMock.record.findMany.mockResolvedValue([createRecordFixture()])
			prismaMock.record.count.mockResolvedValue(1)

			// Act
			const result = await service.getUserRecords("user-1", query)

			// Assert
			expect(prismaMock.record.findMany).toHaveBeenCalledTimes(1)
			const findManyArgs = prismaMock.record.findMany.mock.calls[0][0]
			expect(findManyArgs.skip).toBe(5)
			expect(findManyArgs.take).toBe(5)
			expect(findManyArgs.orderBy).toEqual({ title: "asc" })
			expect(findManyArgs.where).toMatchObject({
				userId: "user-1",
				deletedAt: null,
				tags: {
					some: {
						tagId: {
							in: ["tag-1", "tag-2"],
						},
					},
				},
				status: {
					in: ["COMPLETED", "FAILED"],
				},
				OR: [
					{
						title: {
							contains: "анализ",
							mode: "insensitive",
						},
					},
					{
						description: {
							contains: "анализ",
							mode: "insensitive",
						},
					},
				],
			})
			expect(findManyArgs.where.documents.some.status.not).toBe(
				DocumentStatus.UPLOADING,
			)
			expect(findManyArgs.where.date.gte).toEqual(
				new Date("2024-01-01T00:00:00.000Z"),
			)
			// setHours(23,59,59,999) использует локальное время, поэтому
			// проверяем через Date-объект вместо фиксированной ISO-строки
			const expectedLte = new Date("2024-01-31T00:00:00.000Z")
			expectedLte.setHours(23, 59, 59, 999)
			expect(findManyArgs.where.date.lte).toEqual(expectedLte)
			expect(result.total).toBe(1)
			expect(result.page).toBe(2)
			expect(result.limit).toBe(5)
		})

		it("should map failed document status to record failed status", async () => {
			// Arrange
			const query = new GetRecordsQueryDto()
			prismaMock.record.findMany.mockResolvedValue([
				createRecordFixture({
					documents: [
						{
							id: "doc-1",
							status: DocumentStatus.FAILED,
							failedPhase: "PARSING",
						},
						{
							id: "doc-2",
							status: DocumentStatus.PROCESSING,
							failedPhase: null,
						},
					],
				}),
			])
			prismaMock.record.count.mockResolvedValue(1)

			// Act
			const result = await service.getUserRecords("user-1", query)

			// Assert
			expect(result.data[0].status).toBe(DocumentStatus.FAILED)
			expect(result.data[0].failedPhase).toBe("PARSING")
		})
	})

	describe("getRecordById", () => {
		it("should return record when found and owned by user", async () => {
			// Arrange
			prismaMock.record.findFirst.mockResolvedValue(createRecordFixture())

			// Act
			const result = await service.getRecordById("record-1", "user-1")

			// Assert
			expect(prismaMock.record.findFirst).toHaveBeenCalledWith(
				expect.objectContaining({
					where: {
						id: "record-1",
						userId: "user-1",
						deletedAt: null,
					},
				}),
			)
			expect(result.id).toBe("record-1")
		})

		it("should throw NotFoundException when record does not exist", async () => {
			// Arrange
			prismaMock.record.findFirst.mockResolvedValue(null)

			// Act
			const call = service.getRecordById("missing", "user-1")

			// Assert
			await expect(call).rejects.toThrow(NotFoundException)
		})
	})

	describe("updateRecord", () => {
		it("should update fields and replace tags", async () => {
			// Arrange
			const dto: UpdateRecordDto = {
				title: "Обновлено",
				description: "Новое описание",
				tags: ["tag-3"],
			}

			prismaMock.record.findFirst.mockResolvedValue(createRecordFixture())
			prismaMock.recordTag.deleteMany.mockResolvedValue({ count: 2 })
			prismaMock.record.update.mockResolvedValue(
				createRecordFixture({
					title: dto.title,
					description: dto.description,
				}),
			)

			// Act
			const result = await service.updateRecord("record-1", "user-1", dto)

			// Assert
			expect(prismaMock.recordTag.deleteMany).toHaveBeenCalledWith({
				where: { recordId: "record-1" },
			})
			expect(prismaMock.record.update).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { id: "record-1" },
					data: expect.objectContaining({
						title: dto.title,
						description: dto.description,
					}),
				}),
			)
			expect(result.title).toBe("Обновлено")
		})
	})

	describe("deleteRecord", () => {
		it("should soft delete record", async () => {
			// Arrange
			prismaMock.record.findFirst.mockResolvedValue(createRecordFixture())
			prismaMock.record.update.mockResolvedValue(createRecordFixture())

			// Act
			await service.deleteRecord("record-1", "user-1")

			// Assert
			expect(prismaMock.record.update).toHaveBeenCalledWith({
				where: { id: "record-1" },
				data: {
					deletedAt: expect.any(Date),
				},
			})
		})
	})
})
