import { Module } from "@nestjs/common"
import { JwtModule } from "@nestjs/jwt"
import { PrismaService } from "src/prisma.service"
import { SharedAccessService } from "./shared-access.service"
import { SharedAccessController } from "./shared-access.controller"
import { SharedAccessJwtStrategy } from "./strategies/shared-access-jwt.strategy"
import { SharedAccessJwtRefreshStrategy } from "./strategies/shared-access-jwt-refresh.strategy"
import { SharedAccessCleanupService } from "./shared-access-cleanup.service"
import { SharedAccessVerifyGuard } from "./guards/shared-access-verify.guard"
import { SseModule } from "src/sse/sse.module"

@Module({
	imports: [JwtModule, SseModule],
	controllers: [SharedAccessController],
	providers: [
		SharedAccessService,
		PrismaService,
		SharedAccessJwtStrategy,
		SharedAccessJwtRefreshStrategy,
		SharedAccessCleanupService,
		SharedAccessVerifyGuard,
	],
})
export class SharedAccessModule {}
