import { Injectable } from "@nestjs/common"
import { AuthGuard } from "@nestjs/passport"

@Injectable()
export class SharedAccessRefreshGuard extends AuthGuard(
	"shared-access-jwt-refresh",
) {}
