/*
https://docs.nestjs.com/controllers#controllers
*/

import { Controller, Get } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"
import { PrismaService } from "../prisma/prisma.service"
import { TagResponseDto } from "./dto/tags.dto"

@ApiTags("Tags")
@Controller("tags")
export class TagsController {
	constructor(private prisma: PrismaService) {}

	@ApiOperation({ summary: "Get all tags" })
	@ApiResponse({
		status: 200,
		type: TagResponseDto,
		isArray: true,
	})
	@Get("")
	getAllTags(): Promise<TagResponseDto[]> {
		return this.prisma.tag.findMany()
	}
}
