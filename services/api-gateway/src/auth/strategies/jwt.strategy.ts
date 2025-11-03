import { Injectable } from "@nestjs/common"
import { PassportStrategy } from "@nestjs/passport"
import { FastifyRequest } from "fastify"
import { ExtractJwt, Strategy } from "passport-jwt"
import { EnvService } from "src/env/env.service"
import { UserService } from "src/user/user.service"

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
	constructor(
		configService: EnvService,
		private readonly userService: UserService,
	) {
		super({
			jwtFromRequest: ExtractJwt.fromExtractors([
				(request: FastifyRequest) => {
					return request.cookies?.Authentication ?? null
				},
				ExtractJwt.fromAuthHeaderAsBearerToken(),
			]),
			secretOrKey: configService.get("JWT_SECRET"),
		})
	}

	async validate(payload: { userId: string }) {
		return this.userService.getUserById(payload.userId)
	}
}
