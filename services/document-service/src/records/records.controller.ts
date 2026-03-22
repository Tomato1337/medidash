import {
	Controller,
	Get,
	Post,
	Put,
	Delete,
	Body,
	Param,
	UnauthorizedException,
	Query,
} from "@nestjs/common"
import {
	ApiOperation,
	ApiResponse,
	ApiBearerAuth,
} from "@nestjs/swagger"
import { RecordsService } from "./records.service"
import {
	CreateRecordDto,
	UpdateRecordDto,
	RecordResponseDto,
	RecordsUsersResponseDto,
} from "./dto/record.dto"
import { GetRecordsQueryDto } from "./dto/get-records-query.dto"
import { CurrentUser } from "../common/decorators/current-user.decorator"
import { AuthenticatedUser } from "@shared-types"

@Controller("records")
@ApiBearerAuth()
export class RecordsController {
	constructor(private recordsService: RecordsService) {}

	@Post()
	@ApiOperation({ summary: "Create new record" })
	@ApiResponse({ status: 201, type: RecordResponseDto })
	async createRecord(
		@CurrentUser() user: AuthenticatedUser | null,
		@Body() dto: CreateRecordDto,
	): Promise<RecordResponseDto> {
		if (!user) {
			throw new UnauthorizedException("User ID not provided")
		}
		return this.recordsService.createRecord(user.id, dto)
	}

	@Get()
	@ApiOperation({ summary: "Get user records" })
	@ApiResponse({ status: 200, type: RecordsUsersResponseDto })
	async getUserRecords(
		@CurrentUser() user: AuthenticatedUser | null,
		@Query() query: GetRecordsQueryDto,
	): Promise<RecordsUsersResponseDto> {
		if (!user) {
			throw new UnauthorizedException("User ID not provided")
		}

		return this.recordsService.getUserRecords(user.id, query)
	}

	@Get(":id")
	@ApiOperation({ summary: "Get record by ID" })
	@ApiResponse({ status: 200, type: RecordResponseDto })
	async getRecordById(
		@Param("id") id: string,
		@CurrentUser() user: AuthenticatedUser | null,
	): Promise<RecordResponseDto> {
		if (!user) {
			throw new UnauthorizedException("User ID not provided")
		}
		return this.recordsService.getRecordById(id, user.id)
	}

	@Put(":id")
	@ApiOperation({ summary: "Update record" })
	@ApiResponse({ status: 200, type: RecordResponseDto })
	async updateRecord(
		@Param("id") id: string,
		@CurrentUser() user: AuthenticatedUser | null,
		@Body() dto: UpdateRecordDto,
	): Promise<RecordResponseDto> {
		if (!user) {
			throw new UnauthorizedException("User ID not provided")
		}
		return this.recordsService.updateRecord(id, user.id, dto)
	}

	@Delete(":id")
	@ApiOperation({ summary: "Delete record" })
	@ApiResponse({ status: 204 })
	async deleteRecord(
		@Param("id") id: string,
		@CurrentUser() user: AuthenticatedUser | null,
	): Promise<void> {
		if (!user) {
			throw new UnauthorizedException("User ID not provided")
		}
		return this.recordsService.deleteRecord(id, user.id)
	}
}
