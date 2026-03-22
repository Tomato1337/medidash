import {
	HttpException,
	Injectable,
	Logger,
	NotFoundException,
} from "@nestjs/common"
import { PrismaService } from "../prisma/prisma.service"
import {
	CreateRecordDto,
	UpdateRecordDto,
	RecordResponseDto,
	RecordsUsersResponseDto,
} from "./dto/record.dto"
import { GetRecordsQueryDto } from "./dto/get-records-query.dto"
import { DocumentStatus, type DocumentStatusValues } from "@shared-types"
import {
	Prisma,
	DocumentStatus as PrismaDocumentStatus,
} from "generated/prisma"

/** Shape returned by list queries (minimal document fields) */
type RecordWithMinimalDocs = Prisma.RecordGetPayload<{
	include: {
		tags: { include: { tag: true } }
		documents: { select: { status: true; id: true; failedPhase: true } }
		_count: { select: { documents: true } }
	}
}>

/** Shape returned by detail query (full document fields) */
type RecordWithFullDocs = Prisma.RecordGetPayload<{
	include: {
		tags: { include: { tag: true } }
		documents: {
			select: {
				status: true
				id: true
				failedPhase: true
				fileSize: true
				fileName: true
				originalFileName: true
			}
		}
		_count: { select: { documents: true } }
	}
}>

type RecordWithRelations = RecordWithMinimalDocs | RecordWithFullDocs

@Injectable()
export class RecordsService {
	private readonly logger = new Logger(RecordsService.name)

	constructor(private prisma: PrismaService) {}

	async createRecord(
		userId: string,
		dto: CreateRecordDto,
	): Promise<RecordResponseDto> {
		const isExisting = await this.prisma.record.findUnique({
			where: { id: dto.recordId },
		})
		if (isExisting) {
			throw new HttpException(
				`Record with ID ${dto.recordId} already exists`,
				409,
			)
		}
		const record = await this.prisma.record.create({
			data: {
				userId,
				id: dto.recordId,
				title: dto.title,
				description: dto.description,
				date:
					dto.date && dto.date.toString().trim() !== ""
						? new Date(dto.date)
						: undefined,
				tags: dto.tags
					? {
							create: dto.tags.map((tagId) => ({
								tag: {
									connect: { id: tagId },
								},
							})),
						}
					: undefined,
			},
			include: {
				tags: {
					include: {
						tag: true,
					},
				},
				documents: {
					select: {
						status: true,
						id: true,
						failedPhase: true,
					},
				},
				_count: {
					select: { documents: true },
				},
			},
		})

		this.logger.log(`✅ Created record ${record.id} for user ${userId}`)

		return this.mapToResponseDto(record)
	}

	async getUserRecords(
		userId: string,
		query: GetRecordsQueryDto,
	): Promise<RecordsUsersResponseDto> {
		const page = query.page ?? 1
		const limit = query.limit ?? 10
		const where = this.buildWhereClause(userId, query)
		const orderBy = this.buildOrderBy(query)

		const [records, total] = await Promise.all([
			this.prisma.record.findMany({
				where,
				skip: (page - 1) * limit,
				take: limit,
				include: {
					tags: {
						include: {
							tag: true,
						},
					},
					documents: {
						select: {
							status: true,
							id: true,
							failedPhase: true,
						},
					},
					_count: {
						select: { documents: true },
					},
				},
				orderBy,
			}),
			this.prisma.record.count({ where }),
		])

		return {
			data: records.map((record) => this.mapToResponseDto(record)),
			page,
			limit,
			total,
		}
	}

	private buildWhereClause(
		userId: string,
		query: GetRecordsQueryDto,
	): Prisma.RecordWhereInput {
		const where: Prisma.RecordWhereInput = {
			userId,
			deletedAt: null,
			documents: {
				// Пока загружаются документы, не показываем запись, запись будет локальная
				some: { status: { not: DocumentStatus.UPLOADING } },
			},
		}

		if (query.dateFrom || query.dateTo) {
			const dateFilter: Prisma.DateTimeFilter = {}

			if (query.dateFrom) {
				dateFilter.gte = new Date(query.dateFrom)
			}

			if (query.dateTo) {
				const dateTo = new Date(query.dateTo)
				dateTo.setHours(23, 59, 59, 999)
				dateFilter.lte = dateTo
			}

			where.date = dateFilter
		}

		if (query.tagIds.length > 0) {
			where.tags = {
				some: {
					tagId: {
						in: query.tagIds,
					},
				},
			}
		}

		if (query.statusValues.length > 0) {
			where.status = {
				in: query.statusValues as PrismaDocumentStatus[],
			}
		}

		if (query.search) {
			where.OR = [
				{
					title: {
						contains: query.search,
						mode: "insensitive",
					},
				},
				{
					description: {
						contains: query.search,
						mode: "insensitive",
					},
				},
			]
		}

		return where
	}

	private buildOrderBy(
		query: GetRecordsQueryDto,
	): Prisma.RecordOrderByWithRelationInput {
		return {
			[query.sortBy]: query.sortDir,
		}
	}

	async getRecordById(
		recordId: string,
		userId: string,
	): Promise<RecordResponseDto> {
		const record = await this.prisma.record.findFirst({
			where: {
				id: recordId,
				userId,
				deletedAt: null,
			},
			include: {
				tags: {
					include: {
						tag: true,
					},
				},
				documents: {
					select: {
						status: true,
						id: true,
						failedPhase: true,
						fileSize: true,
						fileName: true,
						originalFileName: true,
					},
				},
				_count: {
					select: { documents: true },
				},
			},
		})

		if (!record) {
			throw new NotFoundException(`Record ${recordId} not found`)
		}

		return this.mapToResponseDto(record)
	}

	async updateRecord(
		recordId: string,
		userId: string,
		dto: UpdateRecordDto,
	): Promise<RecordResponseDto> {
		// Check if record exists
		await this.getRecordById(recordId, userId)

		// Delete old tags if new tags provided
		if (dto.tags) {
			await this.prisma.recordTag.deleteMany({
				where: { recordId },
			})
		}

		const record = await this.prisma.record.update({
			where: { id: recordId },
			data: {
				title: dto.title,
				description: dto.description,
				tags: dto.tags
					? {
							create: dto.tags.map((tagId) => ({
								tag: {
									connect: { id: tagId },
								},
							})),
						}
					: undefined,
			},
			include: {
				tags: {
					include: {
						tag: true,
					},
				},
				documents: {
					select: {
						status: true,
						id: true,
						failedPhase: true,
					},
				},
				_count: {
					select: { documents: true },
				},
			},
		})

		this.logger.log(`✅ Updated record ${recordId}`)

		return this.mapToResponseDto(record)
	}

	async deleteRecord(recordId: string, userId: string): Promise<void> {
		// Check if record exists
		await this.getRecordById(recordId, userId)

		// Soft delete
		await this.prisma.record.update({
			where: { id: recordId },
			data: {
				deletedAt: new Date(),
			},
		})

		this.logger.log(`✅ Deleted record ${recordId}`)
	}

	private mapToResponseDto(record: RecordWithRelations): RecordResponseDto {
		let recordStatus: DocumentStatusValues = DocumentStatus.COMPLETED
		let recordFailedPhase: string | null = null

		if (record.documents && record.documents.length > 0) {
			const statuses = record.documents.map((doc) => doc.status)

			if (statuses.includes(DocumentStatus.FAILED)) {
				recordStatus = DocumentStatus.FAILED
				const failedDoc = record.documents.find(
					(doc) =>
						doc.status === DocumentStatus.FAILED && doc.failedPhase,
				)
				recordFailedPhase = failedDoc?.failedPhase || null
			} else if (statuses.includes(DocumentStatus.UPLOADING)) {
				recordStatus = DocumentStatus.UPLOADING
			} else if (statuses.includes(DocumentStatus.PARSING)) {
				recordStatus = DocumentStatus.PARSING
			} else if (statuses.includes(DocumentStatus.PROCESSING)) {
				recordStatus = DocumentStatus.PROCESSING
			} else if (statuses.every((s) => s === DocumentStatus.COMPLETED)) {
				recordStatus = DocumentStatus.COMPLETED
			}
		}

		return {
			id: record.id,
			userId: record.userId,
			title: record.title,
			description: record.description,
			date: record.date,
			summary: record.summary,
			createdAt: record.createdAt,
			status: recordStatus,
			failedPhase: recordFailedPhase,
			documents:
				record.documents?.map((doc) => ({
					id: doc.id,
					status: doc.status,
					fileSize: (doc as { fileSize?: number }).fileSize ?? 0,
					fileName: (doc as { fileName?: string }).fileName ?? "",
					originalFileName:
						(doc as { originalFileName?: string })
							.originalFileName ?? "",
					failedPhase: doc.failedPhase || null,
				})) || [],
			updatedAt: record.updatedAt,
			tags: record.tags?.map((rt) => rt.tag) || [],
			documentCount: record._count?.documents || 0,
		}
	}
}
