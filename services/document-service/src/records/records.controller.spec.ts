import { Test, TestingModule } from "@nestjs/testing"
import { UnauthorizedException } from "@nestjs/common"
import { describe, it, expect, beforeEach, vi } from "vitest"
import type { AuthenticatedUser } from "@shared-types"
import { RecordsController } from "./records.controller"
import { RecordsService } from "./records.service"
import { CreateRecordDto, UpdateRecordDto } from "./dto/record.dto"
import { GetRecordsQueryDto } from "./dto/get-records-query.dto"

describe("RecordsController", () => {
	let controller: RecordsController

	const recordsServiceMock = {
		createRecord: vi.fn(),
		getUserRecords: vi.fn(),
		getRecordById: vi.fn(),
		updateRecord: vi.fn(),
		deleteRecord: vi.fn(),
	}

	beforeEach(async () => {
		vi.clearAllMocks()

		const module: TestingModule = await Test.createTestingModule({
			controllers: [RecordsController],
			providers: [
				{
					provide: RecordsService,
					useValue: recordsServiceMock,
				},
			],
		}).compile()

		controller = module.get<RecordsController>(RecordsController)
	})

	it("should delegate createRecord with user id", async () => {
		// Arrange
		const user = { id: "user-1" } as AuthenticatedUser
		const dto: CreateRecordDto = {
			recordId: "record-1",
			title: "Запись",
		}
		recordsServiceMock.createRecord.mockResolvedValue({ id: "record-1" })

		// Act
		await controller.createRecord(user, dto)

		// Assert
		expect(recordsServiceMock.createRecord).toHaveBeenCalledWith(
			"user-1",
			dto,
		)
	})

	it("should throw UnauthorizedException when user missing for createRecord", async () => {
		// Arrange
		const dto = { recordId: "record-1", title: "Запись" } as CreateRecordDto

		// Act
		const call = controller.createRecord(null, dto)

		// Assert
		await expect(call).rejects.toThrow(UnauthorizedException)
	})

	it("should delegate getUserRecords with user id", async () => {
		// Arrange
		const user = { id: "user-2" } as AuthenticatedUser
		const query = new GetRecordsQueryDto()
		recordsServiceMock.getUserRecords.mockResolvedValue({
			data: [],
			page: 1,
			limit: 10,
			total: 0,
		})

		// Act
		await controller.getUserRecords(user, query)

		// Assert
		expect(recordsServiceMock.getUserRecords).toHaveBeenCalledWith(
			"user-2",
			query,
		)
	})

	it("should delegate getRecordById", async () => {
		// Arrange
		const user = { id: "user-3" } as AuthenticatedUser
		recordsServiceMock.getRecordById.mockResolvedValue({ id: "record-9" })

		// Act
		await controller.getRecordById("record-9", user)

		// Assert
		expect(recordsServiceMock.getRecordById).toHaveBeenCalledWith(
			"record-9",
			"user-3",
		)
	})

	it("should delegate updateRecord", async () => {
		// Arrange
		const user = { id: "user-4" } as AuthenticatedUser
		const dto: UpdateRecordDto = {
			title: "Обновлено",
		}
		recordsServiceMock.updateRecord.mockResolvedValue({ id: "record-10" })

		// Act
		await controller.updateRecord("record-10", user, dto)

		// Assert
		expect(recordsServiceMock.updateRecord).toHaveBeenCalledWith(
			"record-10",
			"user-4",
			dto,
		)
	})

	it("should delegate deleteRecord", async () => {
		// Arrange
		const user = { id: "user-5" } as AuthenticatedUser
		recordsServiceMock.deleteRecord.mockResolvedValue(undefined)

		// Act
		await controller.deleteRecord("record-11", user)

		// Assert
		expect(recordsServiceMock.deleteRecord).toHaveBeenCalledWith(
			"record-11",
			"user-5",
		)
	})
})
