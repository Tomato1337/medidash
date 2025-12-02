import { Module } from "@nestjs/common"
import { SwaggerAggregatorService } from "./swagger.service"

@Module({
	providers: [SwaggerAggregatorService],
	exports: [SwaggerAggregatorService],
})
export class SwaggerModule {}
