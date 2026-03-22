import { Injectable, Logger } from "@nestjs/common"
import { Cron, CronExpression } from "@nestjs/schedule"
import { PrismaService } from "src/prisma.service"

@Injectable()
export class SharedAccessCleanupService {
	private readonly logger = new Logger(SharedAccessCleanupService.name)

	constructor(private readonly prisma: PrismaService) {}

	@Cron(CronExpression.EVERY_HOUR)
	async cleanupExpiredData() {
		const now = new Date()
		const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000)

		const expiredTokens = await this.prisma.sharedAccessRefreshToken.deleteMany({
			where: { expiresAt: { lt: now } },
		})

		const expiredAccesses = await this.prisma.sharedAccess.updateMany({
			where: {
				status: "ACTIVE",
				expiresAt: { lt: now },
			},
			data: { status: "EXPIRED" },
		})

		const oldLogs = await this.prisma.sharedAccessLog.deleteMany({
			where: { createdAt: { lt: ninetyDaysAgo } },
		})

		this.logger.debug(
			`Shared access cleanup: tokens=${expiredTokens.count}, accesses=${expiredAccesses.count}, logs=${oldLogs.count}`,
		)
	}
}
