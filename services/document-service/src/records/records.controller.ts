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
	ApiTags,
	ApiOperation,
	ApiResponse,
	ApiBearerAuth,
	ApiQuery,
} from "@nestjs/swagger"
import { RecordsService } from "./records.service"
import {
	CreateRecordDto,
	UpdateRecordDto,
	RecordResponseDto,
	RecordsUsersResponseDto,
} from "./dto/record.dto"
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
	@ApiQuery({
		name: "page",
		required: false,
		type: Number,
		example: 1,
		description: "Page number",
	})
	@ApiQuery({
		name: "limit",
		required: false,
		type: Number,
		example: 10,
		description: "Number of records per page",
	})
	@ApiResponse({ status: 200, type: RecordsUsersResponseDto })
	async getUserRecords(
		@CurrentUser() user: AuthenticatedUser | null,
		@Query("page") page?: number,
		@Query("limit") limit?: number,
	): Promise<RecordsUsersResponseDto> {
		if (!user) {
			throw new UnauthorizedException("User ID not provided")
		}

		const maxLimit = Math.min(limit || 10, 100)

		return this.recordsService.getUserRecords(user.id, page || 1, maxLimit)
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
