import { Injectable, UnauthorizedException } from "@nestjs/common"
import { PassportStrategy } from "@nestjs/passport"
import { ExtractJwt, Strategy } from "passport-jwt"
import { FastifyRequest } from "fastify"
import { EnvService } from "src/env/env.service"
import { SharedAccessService } from "../shared-access.service"

type SharedAccessRefreshPayload = {
	sharedAccessId: string
	ownerId: string
	type: "shared-access-refresh"
}

@Injectable()
export class SharedAccessJwtRefreshStrategy extends PassportStrategy(
	Strategy,
	"shared-access-jwt-refresh",
) {
	constructor(
		private readonly envService: EnvService,
		private readonly sharedAccessService: SharedAccessService,
	) {
		super({
			jwtFromRequest: ExtractJwt.fromExtractors([
				(request: FastifyRequest) =>
					request.cookies?.SharedAccessRefresh ?? null,
			]),
			secretOrKey: envService.get("JWT_SHARED_ACCESS_REFRESH_SECRET"),
			passReqToCallback: true,
		})
	}

	async validate(
		request: FastifyRequest,
		payload: SharedAccessRefreshPayload,
	) {
		const refreshToken = request.cookies?.SharedAccessRefresh as string
		if (!refreshToken) {
			throw new UnauthorizedException("Refresh token not found")
		}

		return this.sharedAccessService.validateRefreshToken(
			payload.sharedAccessId,
			refreshToken,
		)
	}
}
