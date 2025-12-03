import { createParamDecorator, ExecutionContext } from "@nestjs/common"
import { AuthenticatedUser } from "@shared-types"

export const CurrentUser = createParamDecorator(
	(data: unknown, ctx: ExecutionContext): AuthenticatedUser | null => {
		const request = ctx.switchToHttp().getRequest()

		const userId = request.headers["x-user-id"]
		if (!userId) return null

		return {
			id: userId,
		}
	},
)
