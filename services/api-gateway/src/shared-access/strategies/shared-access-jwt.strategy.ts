import { Injectable, ForbiddenException } from "@nestjs/common"
import { PassportStrategy } from "@nestjs/passport"
import { ExtractJwt, Strategy } from "passport-jwt"
import { FastifyRequest } from "fastify"
import { EnvService } from "src/env/env.service"
import { PrismaService } from "src/prisma.service"

type SharedAccessJwtPayload = {
	sharedAccessId: string
	ownerId: string
	type: "shared-access"
}

@Injectable()
export class SharedAccessJwtStrategy extends PassportStrategy(
	Strategy,
	"shared-access-jwt",
) {
	constructor(
		private readonly envService: EnvService,
		private readonly prisma: PrismaService,
	) {
		super({
			jwtFromRequest: ExtractJwt.fromExtractors([
				(request: FastifyRequest) => request.cookies?.SharedAccessAuth ?? null,
				ExtractJwt.fromAuthHeaderAsBearerToken(),
			]),
			secretOrKey: envService.get("JWT_SHARED_ACCESS_SECRET"),
		})
	}

	async validate(payload: SharedAccessJwtPayload) {
		const access = await this.prisma.sharedAccess.findUnique({
			where: { id: payload.sharedAccessId },
		})

		if (!access) {
			throw new ForbiddenException("Shared access not found")
		}

		if (access.status !== "ACTIVE") {
			throw new ForbiddenException("Access revoked")
		}

		if (access.expiresAt.getTime() <= Date.now()) {
			throw new ForbiddenException("Access expired")
		}

		return {
			sharedAccessId: payload.sharedAccessId,
			ownerId: payload.ownerId,
		}
	}
}
