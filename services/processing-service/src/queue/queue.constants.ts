/** Названия очередей BullMQ */
export const QUEUES = {
	/** Очередь для парсинга и чанкинга документов */
	PARSING: "parsing-queue",
	/** Очередь для AI обработки (анонимизация, векторизация, тегирование) */
	AI_PROCESSING: "ai-processing-queue",
} as const

/** Названия jobs */
export const JOBS = {
	/** Парсинг одного документа */
	PARSE_DOCUMENT: "parse-document",
	/** AI обработка всего Record */
	PROCESS_RECORD: "process-record",
} as const
