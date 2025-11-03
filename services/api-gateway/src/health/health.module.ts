import { Module } from "@nestjs/common"
import { HealthController } from "./health.controller"
import { CommonModule } from "../common/common.module"

@Module({
	imports: [CommonModule],
	controllers: [HealthController],
})
export class HealthModule {}
