export declare const DocumentStatus: {
    readonly UPLOADING: "UPLOADING";
    readonly COMPRESSING: "COMPRESSING";
    readonly PENDING: "PENDING";
    readonly PARSING: "PARSING";
    readonly PROCESSING: "PROCESSING";
    readonly COMPLETED: "COMPLETED";
    readonly FAILED: "FAILED";
};
export type DocumentStatusValues = (typeof DocumentStatus)[keyof typeof DocumentStatus];
export declare const FailedPhase: {
    readonly PARSING: "PARSING";
    readonly PROCESSING: "PROCESSING";
    readonly COMPRESSING: "COMPRESSING";
    readonly UPLOADING: "UPLOADING";
};
export type FailedPhaseValues = (typeof FailedPhase)[keyof typeof FailedPhase];
export type FailedPhase = FailedPhaseValues;
export interface AuthenticatedUser {
    id: string;
}
export interface ParsingJobData {
    documentId: string;
    recordId: string;
    userId: string;
    minioObjectKey: string;
    mimeType: string;
    originalFileName: string;
    allDocumentIds: string[];
}
export interface AiProcessingJobData {
    recordId: string;
    userId: string;
    documentIds: string[];
}
export interface ProcessingJobData {
    documentId: string;
    userId: string;
    recordId: string;
    fileUrl: string;
    fileName: string;
    mimeType: string;
}
export interface AIProcessingResult {
    anonymizedText: string;
    piiMappings: PiiMapping[];
    tags: string[];
    extractedDate: Date | null;
    generatedTitle: string;
    embedding: number[];
}
export interface PiiMapping {
    original: string;
    replacement: string;
    type: "NAME" | "ADDRESS" | "PHONE" | "EMAIL" | "DATE" | "ID" | "OTHER";
}
export interface SearchQuery {
    query: string;
    userId: string;
    limit?: number;
    offset?: number;
    tags?: string[];
    dateFrom?: Date;
    dateTo?: Date;
}
export interface SearchResult {
    documentId: string;
    recordId: string;
    chunkId: string;
    content: string;
    score: number;
    metadata: {
        title: string;
        date: Date;
        tags: string[];
    };
}
export interface DocumentChunkData {
    content: string;
    order: number;
    embedding?: number[];
    documentId: string;
}
export interface RecordSummary {
    recordId: string;
    summary: string;
    keyPoints: string[];
    documentCount: number;
}
export declare const ProcessingEventType: {
    readonly PARSING_STARTED: "parsing:started";
    readonly PARSING_DOCUMENT_STARTED: "parsing:document:started";
    readonly PARSING_DOCUMENT_COMPLETED: "parsing:document:completed";
    readonly PARSING_COMPLETED: "parsing:completed";
    readonly PARSING_FAILED: "parsing:failed";
    readonly PROCESSING_STARTED: "processing:started";
    readonly PROCESSING_COMPLETED: "processing:completed";
    readonly PROCESSING_FAILED: "processing:failed";
    readonly AI_PROCESSING_STARTED: "ai:started";
    readonly AI_PROCESSING_PROGRESS: "ai:progress";
    readonly AI_PROCESSING_COMPLETED: "ai:completed";
    readonly AI_PROCESSING_FAILED: "ai:failed";
    readonly RECORD_COMPLETED: "record:completed";
    readonly RECORD_FAILED: "record:failed";
};
export type ProcessingEventTypeValues = (typeof ProcessingEventType)[keyof typeof ProcessingEventType];
export type ProcessingEventTypeString = "parsing:started" | "parsing:document:started" | "parsing:document:completed" | "parsing:completed" | "parsing:failed" | "processing:started" | "processing:completed" | "processing:failed";
export interface ProcessingEvent {
    type: ProcessingEventTypeString;
    recordId: string;
    userId: string;
    documentId?: string;
    timestamp: string;
    error?: string;
    data?: Record<string, unknown>;
}
export declare const RedisChannels: {
    readonly RECORD_READY_FOR_PARSING: "record.ready-for-parsing";
    readonly PROCESSING_EVENTS: "processing:events";
    readonly DOCUMENT_STATUS_UPDATE: "document.status.update";
    readonly DOCUMENT_PARSED: "document.parsed";
    readonly RECORD_AI_COMPLETED: "record.ai.completed";
    readonly REQUEST_RETRY_PARSING: "request.retry.parsing";
    readonly REQUEST_RETRY_AI: "request.retry.ai";
    readonly RECORD_READY_FOR_AI: "record.ready-for-ai";
};
