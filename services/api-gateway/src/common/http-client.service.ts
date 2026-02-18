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

		// Правильно объединяем заголовки
		const defaultHeaders: Record<string, string> = {}
		if (options.method !== "GET" && options.method !== "DELETE") {
			defaultHeaders["Content-Type"] = "application/json"
		}

		options.headers = {
			...defaultHeaders,
			...(options.headers as Record<string, string>),
		}

		try {
			const response = await fetch(url, options)
			if (!response.ok) {
				await this.handleErrorResponse(serviceName, response)
			}
			const contentType = response.headers.get("content-type")
			if (contentType?.includes("application/json")) {
				return (await response.json()) as T
			}
			return {} as T
		} catch (error) {
			if (error instanceof HttpException) {
				throw error
			}
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
	 * POST request with raw body (for multipart/form-data, streams, etc.)
	 */
	async postRaw<T = unknown>(
		serviceName: string,
		path: string,
		body: BodyInit,
		headers?: HeadersInit,
	): Promise<T> {
		const baseUrl = this.services.get(serviceName)

		if (!baseUrl) {
			throw new HttpException(
				`Unknown service: ${serviceName}`,
				HttpStatus.INTERNAL_SERVER_ERROR,
			)
		}

		const url = `${baseUrl}${path}`
		this.logger.debug(`Proxying raw request to ${serviceName}: ${url}`)
		this.logger.debug(`Headers: ${JSON.stringify(headers)}`)

		try {
			const response = await fetch(url, {
				method: "POST",
				body,
				headers: headers as Record<string, string>,
				// @ts-expect-error - duplex is required for streams but not in TypeScript types yet
				duplex: "half",
			})
			if (!response.ok) {
				await this.handleErrorResponse(serviceName, response)
			}
			const contentType = response.headers.get("content-type")
			if (contentType?.includes("application/json")) {
				return (await response.json()) as T
			}
			return {} as T
		} catch (error) {
			if (error instanceof HttpException) {
				throw error
			}
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
	 * Handles non-OK HTTP responses from microservices.
	 * Parses JSON error body when available, falls back to text.
	 */
	private async handleErrorResponse(
		serviceName: string,
		response: Response,
	): Promise<never> {
		type ErrorBody = { message?: string | string[]; error?: string }
		let errorData: ErrorBody | null = null
		try {
			errorData = (await response.json()) as ErrorBody
		} catch {
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
		const rawMessage =
			errorData?.message ||
			`Service ${serviceName} returned ${response.status}`
		const message = Array.isArray(rawMessage)
			? rawMessage.join(", ")
			: rawMessage
		this.logger.error(
			`Error from ${serviceName} (${response.status}): ${message}`,
		)
		throw new HttpException(errorData ?? message, response.status)
	}

	/**
	 * Check health of a microservice
	 */
	async checkHealth(serviceName: string): Promise<boolean> {
		try {
			// Most services have global prefix 'api'
			await this.get(serviceName, "/api/health")
			return true
		} catch {
			try {
				// Fallback to /health for services without prefix
				await this.get(serviceName, "/health")
				return true
			} catch {
				return false
			}
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
