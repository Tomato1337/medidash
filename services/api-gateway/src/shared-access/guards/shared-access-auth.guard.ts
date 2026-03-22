import { Injectable } from "@nestjs/common"
import { AuthGuard } from "@nestjs/passport"

@Injectable()
export class SharedAccessAuthGuard extends AuthGuard("shared-access-jwt") {}
