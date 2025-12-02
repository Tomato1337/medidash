import {
	Injectable,
	NestInterceptor,
	ExecutionContext,
	CallHandler,
} from "@nestjs/common"
import { Observable } from "rxjs"

@Injectable()
export class UserContextInterceptor implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const request = context.switchToHttp().getRequest()
		const user = request.user

		if (user) {
			request.headers["x-user-id"] = user.id
		}

		return next.handle()
	}
}
