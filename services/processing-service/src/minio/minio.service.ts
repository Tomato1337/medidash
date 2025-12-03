import { Injectable, Logger, OnModuleInit } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import * as Minio from "minio"
import { EnvService } from "src/env/env.service"

@Injectable()
export class MinioService implements OnModuleInit {
	private readonly logger = new Logger(MinioService.name)
	private client: Minio.Client
	private bucketName: string

	constructor(private configService: EnvService) {
		this.bucketName = this.configService.get("MINIO_BUCKET")

		this.client = new Minio.Client({
			endPoint: this.configService.get("MINIO_ENDPOINT"),
			port: this.configService.get("MINIO_PORT"),
			useSSL: this.configService.get("MINIO_USE_SSL"),
			accessKey: this.configService.get("MINIO_ACCESS_KEY"),
			secretKey: this.configService.get("MINIO_SECRET_KEY"),
		})
	}

	async onModuleInit() {
		try {
			const exists = await this.client.bucketExists(this.bucketName)
			if (!exists) {
				this.logger.warn(`⚠️ Bucket ${this.bucketName} does not exist`)
			} else {
				this.logger.log(
					`✅ Connected to MinIO bucket: ${this.bucketName}`,
				)
			}
		} catch (error) {
			this.logger.error(`❌ Failed to connect to MinIO: ${error.message}`)
			throw error
		}
	}

	/**
	 * Загрузить файл из MinIO в Buffer
	 */
	async downloadFile(objectName: string): Promise<Buffer> {
		try {
			const stream = await this.client.getObject(
				this.bucketName,
				objectName,
			)

			const chunks: Buffer[] = []
			for await (const chunk of stream) {
				chunks.push(chunk)
			}

			this.logger.debug(`✅ Downloaded file: ${objectName}`)
			return Buffer.concat(chunks)
		} catch (error) {
			this.logger.error(
				`❌ Download failed for ${objectName}: ${error.message}`,
			)
			throw error
		}
	}

	/**
	 * Проверить существование файла
	 */
	async fileExists(objectName: string): Promise<boolean> {
		try {
			await this.client.statObject(this.bucketName, objectName)
			return true
		} catch (error) {
			if (error.code === "NotFound") {
				return false
			}
			throw error
		}
	}

	/**
	 * Получить метаданные файла
	 */
	async getFileStats(objectName: string): Promise<{
		size: number
		etag: string
		lastModified: Date
		metaData: Record<string, string>
	}> {
		try {
			const stats = await this.client.statObject(
				this.bucketName,
				objectName,
			)
			return {
				size: stats.size,
				etag: stats.etag,
				lastModified: stats.lastModified,
				metaData: stats.metaData,
			}
		} catch (error) {
			this.logger.error(
				`❌ Get stats failed for ${objectName}: ${error.message}`,
			)
			throw error
		}
	}
}
