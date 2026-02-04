import { Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common"
import axios, { AxiosInstance } from "axios"
import { EnvService } from "../env/env.service"

export interface PiiMapping {
	original: string
	replacement: string
	type: "NAME" | "ADDRESS" | "PHONE" | "EMAIL" | "DATE" | "ID" | "OTHER"
}

export interface AnonymizationResult {
	anonymizedText: string
	piiMappings: PiiMapping[]
}

export interface OcrResult {
	text: string
	confidence: number
	language: string
}

@Injectable()
export class AnonymizationService {
	private readonly logger = new Logger(AnonymizationService.name)
	private readonly client: AxiosInstance

	constructor(private envService: EnvService) {
		const baseURL = this.envService.get("ANONYMIZER_SERVICE_URL")

		this.client = axios.create({
			baseURL,
			timeout: 120000, // 2 минуты для OCR
			headers: {
				"Content-Type": "application/json",
			},
		})

		this.logger.log(`✅ Anonymization Service configured: ${baseURL}`)
	}

	/**
	 * Анонимизирует текст, заменяя персональные данные на плейсхолдеры
	 * Использует Python сервис с spaCy NER
	 */
	async anonymize(text: string): Promise<AnonymizationResult> {
		try {
			const response = await this.client.post<AnonymizationResult>(
				"api/anonymize",
				{ text },
			)

			this.logger.debug(
				`Anonymized text: ${response.data.piiMappings.length} PII items found`,
			)

			return response.data
		} catch (error) {
			if (axios.isAxiosError(error)) {
				this.logger.error(
					`Anonymization failed: ${error.response?.data?.detail || error.message}`,
				)
				throw new HttpException(
					`Anonymization service error: ${error.response?.data?.detail || error.message}`,
					error.response?.status || HttpStatus.SERVICE_UNAVAILABLE,
				)
			}
			throw error
		}
	}

	/**
	 * Извлекает текст из изображения с помощью OCR
	 * Использует Python сервис с Tesseract
	 */
	async ocr(imageBuffer: Buffer, mimeType: string): Promise<OcrResult> {
		try {
			// Конвертируем Buffer в base64
			const base64Image = imageBuffer.toString("base64")

			const response = await this.client.post<OcrResult>("api/ocr", {
				image: base64Image,
				mimeType,
			})

			this.logger.debug(
				`OCR completed: ${response.data.text.length} chars, confidence: ${response.data.confidence}`,
			)

			return response.data
		} catch (error) {
			if (axios.isAxiosError(error)) {
				this.logger.error(
					`OCR failed: ${error.response?.data?.detail || error.message}`,
				)
				throw new HttpException(
					`OCR service error: ${error.response?.data?.detail || error.message}`,
					error.response?.status || HttpStatus.SERVICE_UNAVAILABLE,
				)
			}
			throw error
		}
	}

	/**
	 * Проверка здоровья Python сервиса
	 */
	async healthCheck(): Promise<boolean> {
		try {
			const response = await this.client.get("/health", { timeout: 5000 })
			return response.status === 200
		} catch {
			return false
		}
	}
}
