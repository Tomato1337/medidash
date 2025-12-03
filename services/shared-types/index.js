"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisChannels = exports.ProcessingEventType = exports.FailedPhase = exports.DocumentStatus = void 0;
exports.DocumentStatus = {
    UPLOADING: "UPLOADING",
    PARSING: "PARSING",
    PROCESSING: "PROCESSING",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED",
};
exports.FailedPhase = {
    PARSING: "parsing",
    PROCESSING: "processing",
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
};
//# sourceMappingURL=index.js.map