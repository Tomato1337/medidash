import { Injectable, Logger } from "@nestjs/common"
import { DocumentStatus } from "generated/prisma"
import pdfParse from "pdf-parse"
import { MinioService } from "../minio/minio.service"
import { PrismaService } from "../prisma/prisma.service"
import { EnvService } from "src/env/env.service"

export interface ParsedContent {
	text: string
	pageCount: number
	metadata: {
		title?: string
		author?: string
		creationDate?: string
	}
}

export interface TextChunk {
	content: string
	index: number
	startPosition: number
	endPosition: number
}

@Injectable()
export class ParsingService {
	private readonly logger = new Logger(ParsingService.name)
	private readonly chunkSize: number
	private readonly chunkOverlap: number

	constructor(
		private configService: EnvService,
		private minioService: MinioService,
		private prismaService: PrismaService,
	) {
		this.chunkSize = this.configService.get("CHUNK_SIZE")
		this.chunkOverlap = this.configService.get("CHUNK_OVERLAP")
	}

	/**
	 * Скачивает и парсит документ (PDF или TXT)
	 * Определяет тип по расширению файла
	 */
	async parseDocument(
		objectName: string,
		mimeType?: string,
	): Promise<ParsedContent> {
		this.logger.debug(`Downloading document: ${objectName}`)

		const buffer = await this.minioService.downloadFile(objectName)

		// Определяем тип файла по mimeType или расширению
		const isPdf =
			mimeType === "application/pdf" ||
			objectName.toLowerCase().endsWith(".pdf")
		const isTxt =
			mimeType === "text/plain" ||
			objectName.toLowerCase().endsWith(".txt")

		if (isPdf) {
			return this.parsePdf(buffer)
		} else if (isTxt) {
			return this.parseTxt(buffer)
		} else {
			// По умолчанию пробуем как PDF
			this.logger.warn(
				`Unknown file type for ${objectName}, trying as PDF`,
			)
			return this.parsePdf(buffer)
		}
	}

	/**
	 * Парсит PDF документ
	 */
	private async parsePdf(buffer: Buffer): Promise<ParsedContent> {
		this.logger.debug(`Parsing PDF: ${buffer.length} bytes`)

		const pdfData = await pdfParse(buffer)

		return {
			text: this.cleanText(pdfData.text),
			pageCount: pdfData.numpages,
			metadata: {
				title: pdfData.info?.Title,
				author: pdfData.info?.Author,
				creationDate: pdfData.info?.CreationDate,
			},
		}
	}

	/**
	 * Парсит TXT документ
	 */
	private parseTxt(buffer: Buffer): ParsedContent {
		this.logger.debug(`Parsing TXT: ${buffer.length} bytes`)

		const text = buffer.toString("utf-8")

		return {
			text: this.cleanText(text),
			pageCount: 1, // TXT всегда 1 "страница"
			metadata: {
				// TXT файлы не имеют встроенных метаданных
			},
		}
	}

	/**
	 * Очищает текст от лишних пробелов и символов
	 */
	private cleanText(text: string): string {
		return text
			.replace(/\r\n/g, "\n") // Нормализация переносов
			.replace(/\n{3,}/g, "\n\n") // Убираем множественные переносы
			.replace(/[ \t]+/g, " ") // Множественные пробелы в один
			.replace(/^\s+|\s+$/gm, "") // Trim каждой строки
			.trim()
	}

	/**
	 * Разбивает текст на чанки с перекрытием
	 * Используется для создания эмбеддингов
	 */
	splitIntoChunks(text: string): TextChunk[] {
		const chunks: TextChunk[] = []

		if (text.length <= this.chunkSize) {
			return [
				{
					content: text,
					index: 0,
					startPosition: 0,
					endPosition: text.length,
				},
			]
		}

		let position = 0
		let index = 0

		while (position < text.length) {
			const end = Math.min(position + this.chunkSize, text.length)
			let chunkEnd = end

			// Пытаемся найти конец предложения для более естественного разбиения
			if (end < text.length) {
				const lastSentenceEnd = this.findLastSentenceEnd(
					text,
					position,
					end,
				)
				if (lastSentenceEnd > position + this.chunkSize * 0.5) {
					chunkEnd = lastSentenceEnd
				}
			}

			const chunk = text.slice(position, chunkEnd).trim()

			if (chunk.length > 0) {
				chunks.push({
					content: chunk,
					index,
					startPosition: position,
					endPosition: chunkEnd,
				})
				index++
			}

			// Следующая позиция с учетом перекрытия
			position = chunkEnd - this.chunkOverlap
			if (position <= chunks[chunks.length - 1]?.startPosition) {
				position = chunkEnd
			}
		}

		return chunks
	}

	/**
	 * Находит конец последнего предложения в диапазоне
	 */
	private findLastSentenceEnd(
		text: string,
		start: number,
		end: number,
	): number {
		const sentenceEnders = [". ", "! ", "? ", ".\n", "!\n", "?\n"]
		let lastEnd = start

		for (const ender of sentenceEnders) {
			let searchPos = start
			while (searchPos < end) {
				const pos = text.indexOf(ender, searchPos)
				if (pos === -1 || pos >= end) break
				lastEnd = Math.max(lastEnd, pos + ender.length)
				searchPos = pos + 1
			}
		}

		return lastEnd > start ? lastEnd : end
	}

	/**
	 * Обновляет статус документа в базе данных
	 */
	async updateDocumentStatus(
		documentId: string,
		status: DocumentStatus,
		error?: string,
		failedPhase?: string,
	): Promise<void> {
		await this.prismaService.document.update({
			where: { id: documentId },
			data: {
				status,
				...(error && { errorMessage: error }),
				...(failedPhase && { failedPhase }),
			},
		})
	}

	/**
	 * Сохраняет извлеченный текст (raw) и создаёт записи DocumentChunk
	 * extractedText хранится как raw для recovery
	 * DocumentChunk.content пока содержит оригинальный текст,
	 * анонимизация происходит на этапе AI обработки
	 */
	async saveExtractedContent(
		documentId: string,
		userId: string,
		content: ParsedContent,
		chunks: TextChunk[],
	): Promise<void> {
		// Сохраняем raw текст в Document
		await this.prismaService.document.update({
			where: { id: documentId },
			data: {
				extractedText: content.text, // Raw текст для recovery
				metadata: {
					pageCount: content.pageCount,
					...content.metadata,
					chunksCount: chunks.length,
					chunkSize: this.chunkSize,
					chunkOverlap: this.chunkOverlap,
				},
			},
		})

		// Удаляем старые чанки если есть (для retry)
		await this.prismaService.documentChunk.deleteMany({
			where: { documentId },
		})

		// Создаём записи DocumentChunk с оригинальным текстом
		// embedding = null на этом этапе, будет заполнен после AI обработки
		await this.prismaService.documentChunk.createMany({
			data: chunks.map((chunk) => ({
				documentId,
				userId,
				content: chunk.content, // Пока оригинальный текст, анонимизируется на этапе AI
				order: chunk.index,
				// embedding остаётся null
			})),
		})

		this.logger.debug(
			`Saved extracted content for document ${documentId}: ${content.text.length} chars, ${chunks.length} chunks in DocumentChunk table`,
		)
	}

	/**
	 * Получает документ из базы данных
	 */
	async getDocument(documentId: string) {
		return this.prismaService.document.findUnique({
			where: { id: documentId },
			include: { record: true },
		})
	}

	/**
	 * Проверяет, все ли документы Record спарсены
	 */
	async checkAllDocumentsParsed(recordId: string): Promise<{
		allParsed: boolean
		documentIds: string[]
		failedCount: number
	}> {
		const documents = await this.prismaService.document.findMany({
			where: {
				recordId,
				deletedAt: null,
			},
			select: {
				id: true,
				status: true,
			},
		})

		const parsedStatuses = ["PROCESSING", "COMPLETED"]
		const parsedDocuments = documents.filter((d) =>
			parsedStatuses.includes(d.status),
		)
		const failedDocuments = documents.filter((d) => d.status === "FAILED")

		return {
			allParsed: parsedDocuments.length === documents.length,
			documentIds: parsedDocuments.map((d) => d.id),
			failedCount: failedDocuments.length,
		}
	}
}
