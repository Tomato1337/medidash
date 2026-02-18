"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisChannels = exports.ProcessingEventType = exports.FailedPhase = exports.DocumentStatus = void 0;
exports.DocumentStatus = {
    UPLOADING: "UPLOADING",
    COMPRESSING: "COMPRESSING",
    PENDING: "PENDING",
    PARSING: "PARSING",
    PROCESSING: "PROCESSING",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED",
};
exports.FailedPhase = {
    PARSING: exports.DocumentStatus.PARSING,
    PROCESSING: exports.DocumentStatus.PROCESSING,
    COMPRESSING: exports.DocumentStatus.COMPRESSING,
    UPLOADING: exports.DocumentStatus.UPLOADING,
};
exports.ProcessingEventType = {
    PARSING_STARTED: "parsing:started",
    PARSING_DOCUMENT_STARTED: "parsing:document:started",
    PARSING_DOCUMENT_COMPLETED: "parsing:document:completed",
    PARSING_COMPLETED: "parsing:completed",
    PARSING_FAILED: "parsing:failed",
    PROCESSING_STARTED: "processing:started",
    PROCESSING_COMPLETED: "processing:completed",
    PROCESSING_FAILED: "processing:failed",
    AI_PROCESSING_STARTED: "ai:started",
    AI_PROCESSING_PROGRESS: "ai:progress",
    AI_PROCESSING_COMPLETED: "ai:completed",
    AI_PROCESSING_FAILED: "ai:failed",
    RECORD_COMPLETED: "record:completed",
    RECORD_FAILED: "record:failed",
};
exports.RedisChannels = {
    RECORD_READY_FOR_PARSING: "record.ready-for-parsing",
    PROCESSING_EVENTS: "processing:events",
    DOCUMENT_STATUS_UPDATE: "document.status.update",
    DOCUMENT_PARSED: "document.parsed",
    RECORD_AI_COMPLETED: "record.ai.completed",
    REQUEST_RETRY_PARSING: "request.retry.parsing",
    REQUEST_RETRY_AI: "request.retry.ai",
    RECORD_READY_FOR_AI: "record.ready-for-ai",
};
//# sourceMappingURL=index.js.map