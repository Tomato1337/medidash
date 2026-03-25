import { Test, TestingModule } from "@nestjs/testing"
import { HttpException, HttpStatus } from "@nestjs/common"
import { beforeEach, describe, expect, it, vi } from "vitest"
import axios from "axios"
import { AnonymizationService } from "./anonymization.service"
import { EnvService } from "../env/env.service"

const { postMock, getMock, axiosCreateMock, axiosIsAxiosErrorMock } = vi.hoisted(
	() => {
		const localPostMock = vi.fn()
		const localGetMock = vi.fn()
		const localAxiosCreateMock = vi.fn(() => ({
			post: localPostMock,
			get: localGetMock,
		}))
		const localAxiosIsAxiosErrorMock = vi.fn()

		return {
			postMock: localPostMock,
			getMock: localGetMock,
			axiosCreateMock: localAxiosCreateMock,
			axiosIsAxiosErrorMock: localAxiosIsAxiosErrorMock,
		}
	},
)

vi.mock("axios", () => ({
	default: {
		create: axiosCreateMock,
		isAxiosError: axiosIsAxiosErrorMock,
	},
}))

describe("AnonymizationService", () => {
	let service: AnonymizationService

	const envServiceMock = {
		get: vi.fn((key: string) => {
			if (key === "ANONYMIZER_SERVICE_URL") {
				return "http://anonymizer:8000"
			}
			return undefined
		}),
	}

	beforeEach(async () => {
		vi.clearAllMocks()

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				AnonymizationService,
				{
					provide: EnvService,
					useValue: envServiceMock,
				},
			],
		}).compile()

		service = module.get<AnonymizationService>(AnonymizationService)
	})

	describe("constructor", () => {
		it("should configure axios client with baseURL and timeout", () => {
			// Act
			const localService = service

			// Assert
			expect(localService).toBeDefined()
			expect(axiosCreateMock).toHaveBeenCalledWith({
				baseURL: "http://anonymizer:8000",
				timeout: 120000,
				headers: {
					"Content-Type": "application/json",
				},
			})
		})
	})

	describe("anonymize", () => {
		it("should call anonymizer api and return response data", async () => {
			// Arrange
			postMock.mockResolvedValue({
				data: {
					anonymizedText: "Пациент [NAME]",
					piiMappings: [
						{
							original: "Иван Иванов",
							replacement: "[NAME]",
							type: "NAME",
						},
					],
				},
			})

			// Act
			const result = await service.anonymize("Пациент Иван Иванов")

			// Assert
			expect(postMock).toHaveBeenCalledWith("api/anonymize", {
				text: "Пациент Иван Иванов",
			})
			expect(result).toEqual({
				anonymizedText: "Пациент [NAME]",
				piiMappings: [
					{
						original: "Иван Иванов",
						replacement: "[NAME]",
						type: "NAME",
					},
				],
			})
		})

		it("should throw HttpException when anonymizer is unavailable", async () => {
			// Arrange
			const axiosError = {
				message: "connect ECONNREFUSED",
				response: {
					status: 503,
					data: {
						detail: "Service unavailable",
					},
				},
			}
			postMock.mockRejectedValue(axiosError)
			axiosIsAxiosErrorMock.mockReturnValue(true)

			// Act
			const call = service.anonymize("text")

			// Assert
			await expect(call).rejects.toThrow(HttpException)
			await expect(call).rejects.toMatchObject({
				status: 503,
			})
		})

		it("should throw default service unavailable when axios status is missing", async () => {
			// Arrange
			const axiosError = {
				message: "Network Error",
				response: undefined,
			}
			postMock.mockRejectedValue(axiosError)
			axiosIsAxiosErrorMock.mockReturnValue(true)

			// Act
			const call = service.anonymize("text")

			// Assert
			await expect(call).rejects.toThrow(HttpException)
			await expect(call).rejects.toMatchObject({
				status: HttpStatus.SERVICE_UNAVAILABLE,
			})
		})
	})

	describe("ocr", () => {
		it("should convert image to base64 and return OCR result", async () => {
			// Arrange
			postMock.mockResolvedValue({
				data: {
					text: "Распознанный текст",
					confidence: 0.95,
					language: "ru",
				},
			})
			const imageBuffer = Buffer.from("binary-image")

			// Act
			const result = await service.ocr(imageBuffer, "image/jpeg")

			// Assert
			expect(postMock).toHaveBeenCalledWith("api/ocr", {
				image: imageBuffer.toString("base64"),
				mimeType: "image/jpeg",
			})
			expect(result).toEqual({
				text: "Распознанный текст",
				confidence: 0.95,
				language: "ru",
			})
		})

		it("should throw HttpException when OCR request fails", async () => {
			// Arrange
			const axiosError = {
				message: "timeout",
				response: {
					status: 504,
					data: {
						detail: "Gateway timeout",
					},
				},
			}
			postMock.mockRejectedValue(axiosError)
			axiosIsAxiosErrorMock.mockReturnValue(true)

			// Act
			const call = service.ocr(Buffer.from("img"), "image/png")

			// Assert
			await expect(call).rejects.toThrow(HttpException)
			await expect(call).rejects.toMatchObject({
				status: 504,
			})
		})

		it("should rethrow non-axios errors", async () => {
			// Arrange
			postMock.mockRejectedValue(new Error("unexpected failure"))
			axiosIsAxiosErrorMock.mockReturnValue(false)

			// Act
			const call = service.ocr(Buffer.from("img"), "image/png")

			// Assert
			await expect(call).rejects.toThrow("unexpected failure")
		})
	})

	describe("healthCheck", () => {
		it("should return true when health endpoint returns 200", async () => {
			// Arrange
			getMock.mockResolvedValue({ status: 200 })

			// Act
			const result = await service.healthCheck()

			// Assert
			expect(getMock).toHaveBeenCalledWith("/health", { timeout: 5000 })
			expect(result).toBe(true)
		})

		it("should return false when health endpoint fails", async () => {
			// Arrange
			getMock.mockRejectedValue(new Error("service down"))

			// Act
			const result = await service.healthCheck()

			// Assert
			expect(result).toBe(false)
		})
	})
})

describe("axios import in tests", () => {
	it("should keep mocked axios module shape", () => {
		// Arrange
		const clientFactory = axios.create

		// Act
		const isFunction = typeof clientFactory

		// Assert
		expect(isFunction).toBe("function")
	})
})
