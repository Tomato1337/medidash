import { AuthService } from "./auth.service"
import { AuthController } from "./auth.controller"
import { Module } from "@nestjs/common"
import { UserModule } from "src/user/user.module"
import { JwtModule } from "@nestjs/jwt"
import { PrismaService } from "src/prisma.service"
import { LocalStrategy } from "./strategies/local.strategy"
import { JwtStrategy } from "./strategies/jwt.strategy"
import { JwtRefreshStrategy } from "./strategies/jwt-refresh.strategy"

@Module({
	imports: [UserModule, JwtModule],
	controllers: [AuthController],
	providers: [
		AuthService,
		PrismaService,
		LocalStrategy,
		JwtStrategy,
		JwtRefreshStrategy,
	],
	exports: [AuthService],
})
export class AuthModule {}
