/**
 * Утилиты для сохранения клона запроса при middleware retry-логике.
 *
 * openapi-fetch потребляет body при первом запросе, поэтому для повторной
 * отправки после обновления токена необходимо сохранить клон заранее.
 */

const RETRY_KEY = Symbol("retryRequest")

/** Оборачивает запрос: ставит credentials: "include" и сохраняет клон для retry */
export function prepareRetryableRequest(request: Request): Request {
	const prepared = new Request(request, { credentials: "include" })
	const clone = prepared.clone()
	;(prepared as Record<symbol, unknown>)[RETRY_KEY] = clone
	return prepared
}

/** Извлекает ранее сохранённый клон запроса (fallback — clone текущего) */
export function getRetryClone(request: Request): Request {
	return ((request as Record<symbol, unknown>)[RETRY_KEY] as Request) ?? request.clone()
}
