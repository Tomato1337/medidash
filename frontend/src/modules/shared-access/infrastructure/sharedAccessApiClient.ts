import createClient, { type Middleware } from "openapi-fetch"
import type { paths } from "@/shared/api/schema.d"
import { env } from "@/shared/config/env"
import { prepareRetryableRequest, getRetryClone } from "@/shared/api/retryRequest"
import { refreshSharedAccess } from "./sharedAccessApi"

// Кеш клиентов по токену — один client + middleware на токен, а не на каждый вызов
const clientsByToken = new Map<string, ReturnType<typeof createClient<paths>>>()

interface RefreshState {
	isRefreshing: boolean
	failedQueue: Array<{ resolve: () => void; reject: (e?: unknown) => void }>
}

const refreshStateByToken = new Map<string, RefreshState>()

function getRefreshState(token: string) {
	if (!refreshStateByToken.has(token)) {
		refreshStateByToken.set(token, { isRefreshing: false, failedQueue: [] })
	}
	return refreshStateByToken.get(token)!
}

function processQueue(token: string, error: Error | null) {
	const state = getRefreshState(token)
	state.failedQueue.forEach((prom) => {
		if (error) prom.reject(error)
		else prom.resolve()
	})
	state.failedQueue = []
}

function redirectToPasswordPage(token: string) {
	const target = `/shared/${token}`
	if (typeof window !== "undefined" && !window.location.pathname.endsWith(target)) {
		window.location.replace(target)
	}
}

function buildClient(token: string) {
	const sharedMiddleware: Middleware = {
		async onRequest({ request }) {
			return prepareRetryableRequest(request)
		},
		async onResponse({ response, request }) {
			if (response.ok) {
				return response
			}

			if (response.status === 401 || response.status === 403) {
				const originalRequest = getRetryClone(request)
				const state = getRefreshState(token)

				if (state.isRefreshing) {
					try {
						await new Promise<void>((resolve, reject) => {
							state.failedQueue.push({ resolve, reject })
						})
						return fetch(originalRequest)
					} catch {
						redirectToPasswordPage(token)
						return response
					}
				}

				state.isRefreshing = true
				try {
					await refreshSharedAccess(token)
					processQueue(token, null)
					state.isRefreshing = false
					return fetch(originalRequest)
				} catch (error) {
					processQueue(token, error as Error)
					state.isRefreshing = false
					// Refresh не удался — сессия истекла, перенаправляем на ввод пароля
					redirectToPasswordPage(token)
					return response
				}
			}

			return response
		},
	}

	const client = createClient<paths>({ baseUrl: env.VITE_URL_TO_BACKEND })
	client.use(sharedMiddleware)
	return client
}

/** Возвращает типизированный client с auth-middleware для гостевого токена */
export function getSharedAccessClient(token: string) {
	let client = clientsByToken.get(token)
	if (!client) {
		client = buildClient(token)
		clientsByToken.set(token, client)
	}
	return client
}
