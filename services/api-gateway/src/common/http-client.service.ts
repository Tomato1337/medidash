import { Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common"
import { EnvService } from "../env/env.service"

export interface MicroserviceConfig {
	name: string
	baseUrl: string
}

@Injectable()
export class HttpClientService {
	private readonly logger = new Logger(HttpClientService.name)
	private readonly services: Map<string, string>

	constructor(private readonly envService: EnvService) {
		this.services = new Map([
			["document", this.envService.get("DOCUMENT_SERVICE_URL")],
			["processing", this.envService.get("PROCESSING_SERVICE_URL")],
			["ai", this.envService.get("AI_SERVICE_URL")],
			["search", this.envService.get("SEARCH_SERVICE_URL")],
		])
	}

	/**
	 * Proxy request to a microservice
	 */
	async proxyRequest<T = unknown>(
		serviceName: string,
		path: string,
		options: RequestInit = {},
	): Promise<T> {
		const baseUrl = this.services.get(serviceName)

		if (!baseUrl) {
			throw new HttpException(
				`Unknown service: ${serviceName}`,
				HttpStatus.INTERNAL_SERVER_ERROR,
			)
		}

		const url = `${baseUrl}${path}`

		this.logger.debug(`Proxying request to ${serviceName}: ${url}`)

		options.headers =
			options.method === "GET" || options.method === "DELETE"
				? options.headers
				: { ...options.headers, "Content-Type": "application/json" }

		try {
			const response = await fetch(url, options)

			if (!response.ok) {
				let errorData: { message?: string; error?: string } | null =
					null

				try {
					errorData = (await response.json()) as {
						message?: string
						error?: string
					}
				} catch {
					// Если не JSON, используем текст
					const errorText = await response.text()
					this.logger.error(
						`Error from ${serviceName} (${response.status}): ${errorText}`,
					)
					throw new HttpException(
						errorText ||
							`Service ${serviceName} returned ${response.status}`,
						response.status,
					)
				}

				const message =
					errorData?.message ||
					`Service ${serviceName} returned ${response.status}`
				this.logger.error(
					`Error from ${serviceName} (${response.status}): ${message}`,
				)

				throw new HttpException(message, response.status)
			}

			// Проверяем, есть ли контент
			const contentType = response.headers.get("content-type")
			if (contentType?.includes("application/json")) {
				return (await response.json()) as T
			}

			// Если не JSON, возвращаем пустой объект
			return {} as T
		} catch (error) {
			// Если это уже HttpException, пробрасываем дальше
			if (error instanceof HttpException) {
				throw error
			}

			// Обрабатываем сетевые ошибки
			const message =
				error instanceof Error ? error.message : "Unknown error"
			this.logger.error(
				`Failed to communicate with ${serviceName}: ${message}`,
			)

			throw new HttpException(
				`Failed to communicate with ${serviceName}: ${message}`,
				HttpStatus.SERVICE_UNAVAILABLE,
			)
		}
	}

	/**
	 * GET request to a microservice
	 */
	async get<T = unknown>(
		serviceName: string,
		path: string,
		headers?: HeadersInit,
	): Promise<T> {
		return this.proxyRequest<T>(serviceName, path, {
			method: "GET",
			headers,
		})
	}

	/**
	 * POST request to a microservice
	 */
	async post<T = unknown>(
		serviceName: string,
		path: string,
		body?: unknown,
		headers?: HeadersInit,
	): Promise<T> {
		return this.proxyRequest<T>(serviceName, path, {
			method: "POST",
			body: body ? JSON.stringify(body) : undefined,
			headers,
		})
	}

	/**
	 * PUT request to a microservice
	 */
	async put<T = unknown>(
		serviceName: string,
		path: string,
		body?: unknown,
		headers?: HeadersInit,
	): Promise<T> {
		return this.proxyRequest<T>(serviceName, path, {
			method: "PUT",
			body: body ? JSON.stringify(body) : undefined,
			headers,
		})
	}

	/**
	 * PATCH request to a microservice
	 */
	async patch<T = unknown>(
		serviceName: string,
		path: string,
		body?: unknown,
		headers?: HeadersInit,
	): Promise<T> {
		return this.proxyRequest<T>(serviceName, path, {
			method: "PATCH",
			body: body ? JSON.stringify(body) : undefined,
			headers,
		})
	}

	/**
	 * DELETE request to a microservice
	 */
	async delete<T = unknown>(
		serviceName: string,
		path: string,
		headers?: HeadersInit,
	): Promise<T> {
		return this.proxyRequest<T>(serviceName, path, {
			method: "DELETE",
			headers,
		})
	}

	/**
	 * Check health of a microservice
	 */
	async checkHealth(serviceName: string): Promise<boolean> {
		try {
			await this.get(serviceName, "/health")
			return true
		} catch {
			return false
		}
	}

	/**
	 * Get all registered services
	 */
	getServices(): MicroserviceConfig[] {
		return Array.from(this.services.entries()).map(([name, baseUrl]) => ({
			name,
			baseUrl,
		}))
	}
}
