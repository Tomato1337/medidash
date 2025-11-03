import { Injectable } from "@nestjs/common"
import { PassportStrategy } from "@nestjs/passport"
import { ExtractJwt, Strategy } from "passport-jwt"
import { EnvService } from "src/env/env.service"
import { AuthService } from "../auth.service"
import { FastifyRequest } from "fastify"

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
	Strategy,
	"jwt-refresh",
) {
	constructor(
		configService: EnvService,
		private readonly authService: AuthService,
	) {
		super({
			jwtFromRequest: ExtractJwt.fromExtractors([
				(request: FastifyRequest) => {
					return request.cookies?.Refresh ?? null
				},
			]),
			secretOrKey: configService.get("JWT_REFRESH_SECRET"),
			passReqToCallback: true,
		})
	}

	async validate(request: FastifyRequest, payload: { userId: string }) {
		const refreshToken = request.cookies?.Refresh as string
		if (!refreshToken) {
			throw new Error("Refresh token not found")
		}
		return this.authService.verifyUserRefreshToken(
			refreshToken,
			payload.userId,
		)
	}
}
