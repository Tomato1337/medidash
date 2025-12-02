import { createParamDecorator, ExecutionContext } from "@nestjs/common"
import { AuthenticatedUser } from "@shared-types"

const getCurrentUserByContext = (context: ExecutionContext) =>
	context.switchToHttp().getRequest().user as AuthenticatedUser | null

export const CurrentUser = createParamDecorator(
	(_data: unknown, context: ExecutionContext) =>
		getCurrentUserByContext(context),
)
