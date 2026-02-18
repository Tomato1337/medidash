import { Injectable, Logger } from "@nestjs/common"
import pdfParse from "pdf-parse"
import { MinioService } from "../minio/minio.service"
import { PrismaService } from "../prisma/prisma.service"
import { EventsService } from "../events/events.service"
import { EnvService } from "src/env/env.service"
import { RedisChannels } from "@shared-types"

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
		private eventsService: EventsService,
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
	 * Публикует обновление статуса документа в document-service через Redis.
	 * document-service подписан на этот канал и обновляет свою БД.
	 */
	async publishDocumentStatusUpdate(
		documentId: string,
		recordId: string,
		userId: string,
		status: string,
		error?: string,
		failedPhase?: string,
	): Promise<void> {
		await this.eventsService.publishToChannel(
			RedisChannels.DOCUMENT_STATUS_UPDATE,
			{
				documentId,
				recordId,
				userId,
				status,
				...(error && { errorMessage: error }),
				...(failedPhase && { failedPhase }),
			},
		)
	}

	/**
	 * Публикует результат парсинга в document-service через Redis.
	 * document-service сохраняет extractedText и metadata в Document.
	 */
	async publishDocumentParsed(
		documentId: string,
		recordId: string,
		userId: string,
		content: ParsedContent,
		chunksCount: number,
	): Promise<void> {
		await this.eventsService.publishToChannel(
			RedisChannels.DOCUMENT_PARSED,
			{
				documentId,
				recordId,
				userId,
				extractedText: content.text,
				metadata: {
					pageCount: content.pageCount,
					...content.metadata,
					chunksCount,
					chunkSize: this.chunkSize,
					chunkOverlap: this.chunkOverlap,
				},
			},
		)
	}

	/**
	 * Сохраняет чанки в processing-service БД (DocumentChunk — своя схема)
	 */
	async saveChunks(
		documentId: string,
		recordId: string,
		userId: string,
		chunks: TextChunk[],
	): Promise<void> {
		// Удаляем старые чанки если есть (для retry)
		await this.prismaService.documentChunk.deleteMany({
			where: { documentId },
		})

		// Создаём записи DocumentChunk с оригинальным текстом
		// embedding = null на этом этапе, будет заполнен после AI обработки
		await this.prismaService.documentChunk.createMany({
			data: chunks.map((chunk) => ({
				documentId,
				recordId,
				userId,
				content: chunk.content,
				order: chunk.index,
				// embedding остаётся null
			})),
		})

		this.logger.debug(
			`Saved ${chunks.length} chunks for document ${documentId}`,
		)
	}

	/**
	 * Проверяет, все ли документы Record спарсены.
	 * Использует только processing-service БД (DocumentChunk).
	 * Логика: если для recordId есть чанки от N документов — все спарсены.
	 * expectedCount передаётся из job payload.
	 */
	async checkAllDocumentsParsed(
		recordId: string,
		expectedDocumentIds: string[],
	): Promise<{
		allParsed: boolean
		documentIds: string[]
	}> {
		// Находим уникальные documentId у которых есть чанки для этого recordId
		const chunks = await this.prismaService.documentChunk.findMany({
			where: { recordId },
			select: { documentId: true },
			distinct: ["documentId"],
		})

		const parsedDocumentIds = chunks.map((c) => c.documentId)
		const allParsed = expectedDocumentIds.every((id) =>
			parsedDocumentIds.includes(id),
		)

		return {
			allParsed,
			documentIds: parsedDocumentIds,
		}
	}
}
