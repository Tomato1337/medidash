import { Injectable, Logger, OnModuleInit } from "@nestjs/common"
import * as Minio from "minio"
import { EnvService } from "src/env/env.service"
import { Readable } from "stream"

@Injectable()
export class MinioService implements OnModuleInit {
	private readonly logger = new Logger(MinioService.name)
	private client: Minio.Client
	private bucketName: string
	private useSSL: boolean
	private accessKey: string
	private secretKey: string

	constructor(private configService: EnvService) {
		this.bucketName =
			this.configService.get("MINIO_BUCKET_NAME") || "medical-documents"

		this.useSSL = this.configService.get("MINIO_USE_SSL") === "true"
		this.accessKey =
			this.configService.get("MINIO_ACCESS_KEY") || "minioadmin"
		this.secretKey =
			this.configService.get("MINIO_SECRET_KEY") || "minioadmin"

		// Client uses internal Docker DNS name "minio"
		// Nginx proxies external requests to minio:9000
		this.client = new Minio.Client({
			endPoint: this.configService.get("MINIO_ENDPOINT") || "minio",
			port: this.configService.get("MINIO_PORT") || 9000,
			useSSL: this.useSSL,
			accessKey: this.accessKey,
			secretKey: this.secretKey,
		})
	}

	async onModuleInit() {
		try {
			const exists = await this.client.bucketExists(this.bucketName)
			if (!exists) {
				await this.client.makeBucket(this.bucketName, "us-east-1")
				this.logger.log(`✅ Created bucket: ${this.bucketName}`)
			} else {
				this.logger.log(`✅ Bucket exists: ${this.bucketName}`)
			}
		} catch (error) {
			this.logger.error(`❌ Failed to initialize MinIO: ${error.message}`)
			throw error
		}
	}

	/**
	 * Upload file using Buffer (для малых файлов или когда нужен весь файл в памяти)
	 * @deprecated Используйте uploadStream для больших файлов
	 */
	async uploadFile(
		objectName: string,
		buffer: Buffer,
		metadata?: Record<string, string>,
	): Promise<string> {
		try {
			await this.client.putObject(
				this.bucketName,
				objectName,
				buffer,
				buffer.length,
				metadata,
			)

			this.logger.log(`✅ Uploaded file: ${objectName}`)
			return objectName
		} catch (error) {
			this.logger.error(`❌ Upload failed: ${error.message}`)
			throw error
		}
	}

	/**
	 * Upload file using Stream (рекомендуется для всех файлов)
	 * Не загружает весь файл в память, использует streaming
	 */
	async uploadStream(
		objectName: string,
		stream: Readable,
		size: number,
		metadata?: Record<string, string>,
	): Promise<string> {
		try {
			await this.client.putObject(
				this.bucketName,
				objectName,
				stream,
				size,
				metadata,
			)

			this.logger.log(`✅ Uploaded file via stream: ${objectName}`)
			return objectName
		} catch (error) {
			this.logger.error(`❌ Stream upload failed: ${error.message}`)
			throw error
		}
	}

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

			return Buffer.concat(chunks)
		} catch (error) {
			this.logger.error(`❌ Download failed: ${error.message}`)
			throw error
		}
	}

	async deleteFile(objectName: string): Promise<void> {
		try {
			await this.client.removeObject(this.bucketName, objectName)
			this.logger.log(`✅ Deleted file: ${objectName}`)
		} catch (error) {
			this.logger.error(`❌ Delete failed: ${error.message}`)
			throw error
		}
	}

	/**
	 * Получить временную ссылку для скачивания файла
	 * Nginx проксирует запросы к minio:9000 для браузеров
	 */
	async getFileUrl(
		objectName: string,
		expirySeconds = 3600,
	): Promise<string> {
		try {
			return await this.client.presignedGetObject(
				this.bucketName,
				objectName,
				expirySeconds,
			)
		} catch (error) {
			this.logger.error(`❌ URL generation failed: ${error.message}`)
			throw error
		}
	}

	/**
	 * Получить pre-signed URL для прямой загрузки файла клиентом
	 * Клиент может загружать файл напрямую в MinIO минуя бэкенд
	 * Nginx проксирует запросы к minio:9000 для браузеров
	 */
	async getPresignedUploadUrl(
		objectName: string,
		expirySeconds = 300, // 5 минут по умолчанию
	): Promise<string> {
		try {
			const url = await this.client.presignedPutObject(
				this.bucketName,
				objectName,
				expirySeconds,
			)

			this.logger.log(`Generated presigned URL: ${url}`)
			return url
		} catch (error) {
			this.logger.error(
				`❌ Upload URL generation failed: ${error.message}`,
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
			this.logger.error(`❌ Get stats failed: ${error.message}`)
			throw error
		}
	}
}
