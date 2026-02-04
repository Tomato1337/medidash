import "@fastify/cookie"

declare module "fastify" {
	interface FastifyRequest {
		cookies: {
			[cookieName: string]: string | undefined
		}
		user: {
			id: string
			email: string
			name: string
			role: string
		}
	}

	interface FastifyReply {
		setCookie(
			name: string,
			value: string,
			options?: import("@fastify/cookie").CookieSerializeOptions,
		): this
		clearCookie(
			name: string,
			options?: import("@fastify/cookie").CookieSerializeOptions,
		): this
	}
}
