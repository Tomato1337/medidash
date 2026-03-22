import { EnvModule } from "./env/env.module"
import { AuthModule } from "./auth/auth.module"
import { UserModule } from "./user/user.module"
import { CommonModule } from "./common/common.module"
import { HealthModule } from "./health/health.module"
import { SseModule } from "./sse/sse.module"
import { ProxyModule } from "./proxy/proxy.module"
import { SwaggerModule } from "./swagger/swagger.module"
import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler"
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core"
import configuration from "src/env/configuration"
import { validateEnv } from "src/env/env.schema"
import { EnvService } from "./env/env.service"
import { AllExceptionsFilter } from "./common/all-exceptions.filter"
import { LoggerMiddleware } from "./common/logger.middleware"
import { UserContextInterceptor } from "./common/user-context.interceptor"
import { SharedAccessModule } from "./shared-access/shared-access.module"
import { ScheduleModule } from "@nestjs/schedule"

@Module({
	imports: [
		EnvModule,
		ConfigModule.forRoot({
			isGlobal: true,
			load: [configuration],
			validate: validateEnv,
		}),

		ScheduleModule.forRoot(),

		ThrottlerModule.forRootAsync({
			inject: [EnvService],
			useFactory: (envService: EnvService) => ({
				throttlers: [
					{
						ttl: envService.get("RATE_LIMIT_TTL") * 1000,
						limit: envService.get("RATE_LIMIT_MAX"),
					},
				],
			}),
		}),

		CommonModule,
		SwaggerModule,

		HealthModule,
		SseModule,
		ProxyModule,
		AuthModule,
		UserModule,
		SharedAccessModule,
	],
	controllers: [],
	providers: [
		{
			provide: APP_GUARD,
			useClass: ThrottlerGuard,
		},
		{
			provide: APP_FILTER,
			useClass: AllExceptionsFilter,
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: UserContextInterceptor,
		},
	],
})
export class AppModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(LoggerMiddleware).forRoutes("*")
	}
}
