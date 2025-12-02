import { Injectable, Logger } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import type { OpenAPIObject } from "@nestjs/swagger"
import { EnvService } from "src/env/env.service"

export interface ServiceSpec {
	name: string
	url: string
	basePath?: string
}

@Injectable()
export class SwaggerAggregatorService {
	private readonly logger = new Logger(SwaggerAggregatorService.name)
	private readonly services: ServiceSpec[] = []

	constructor(private configService: EnvService) {
		// Register all microservices
		this.registerService({
			name: "Document Service",
			url:
				this.configService.get("DOCUMENT_SERVICE_URL") ||
				"http://document-service:3001",
		})
	}

	private registerService(service: ServiceSpec) {
		this.services.push(service)
		this.logger.log(`Registered service: ${service.name} at ${service.url}`)
	}

	async aggregateSpecs(): Promise<OpenAPIObject> {
		const aggregated: OpenAPIObject = {
			openapi: "3.0.0",
			info: {
				title: "Health Helper API",
				description:
					"Unified API documentation for all Health Helper microservices",
				version: "1.0.0",
			},
			servers: [
				{
					url: "/",
					description: "API Gateway",
				},
			],
			paths: {},
			components: {
				schemas: {},
				securitySchemes: {
					bearer: {
						type: "http",
						scheme: "bearer",
						bearerFormat: "JWT",
					},
				},
			},
			tags: [],
		}

		for (const service of this.services) {
			try {
				const response = await fetch(
					`${service.url}/api/openapi.json`,
					{
						signal: AbortSignal.timeout(5000),
					},
				)

				if (!response.ok) {
					throw new Error(
						`HTTP ${response.status}: ${response.statusText}`,
					)
				}

				const spec = (await response.json()) as OpenAPIObject

				this.logger.log(`Fetched OpenAPI spec from ${service.name}`)

				if (spec.tags && aggregated.tags) {
					const serviceTag = {
						name: service.name,
						description:
							spec.info?.description ||
							`${service.name} endpoints`,
					}
					if (!aggregated.tags.some((t) => t.name === service.name)) {
						aggregated.tags.push(serviceTag)
					}
				}

				if (spec.paths && aggregated.paths) {
					for (const [path, methods] of Object.entries(spec.paths)) {
						const finalPath = path

						if (methods && typeof methods === "object") {
							for (const operation of Object.values(methods)) {
								if (
									operation &&
									typeof operation === "object"
								) {
									const op = operation as Record<
										string,
										unknown
									>
									op.tags = [service.name]
								}
							}
						}

						aggregated.paths[finalPath] = methods
					}
				}

				if (
					spec.components?.schemas &&
					aggregated.components?.schemas
				) {
					Object.assign(
						aggregated.components.schemas,
						spec.components.schemas,
					)
				}

				if (
					spec.components?.securitySchemes &&
					aggregated.components?.securitySchemes
				) {
					Object.assign(
						aggregated.components.securitySchemes,
						spec.components.securitySchemes,
					)
				}
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : String(error)
				this.logger.error(
					`Failed to fetch spec from ${service.name}: ${errorMessage}`,
				)
			}
		}

		aggregated.tags?.unshift({
			name: "API Gateway",
			description: "API Gateway endpoints (auth, health, etc.)",
		})

		this.logger.log(
			`Aggregated ${this.services.length} service specs with ${Object.keys(aggregated.paths || {}).length} paths`,
		)

		return aggregated
	}

	getServices(): ServiceSpec[] {
		return this.services
	}
}
