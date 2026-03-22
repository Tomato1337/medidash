import type { DTO } from "@/shared/api/api"

// Типы из сгенерированной OpenAPI-схемы
export type SharedAccess = DTO["SharedAccessResponseDto"]
export type SharedAccessSession = DTO["SharedAccessSessionResponseDto"]
export type SharedAccessInfo = DTO["SharedAccessInfoResponseDto"]
export type CreateSharedAccessResponse = DTO["CreateSharedAccessResponseDto"]

// Входные типы
export type CreateSharedAccessInput = DTO["CreateSharedAccessDto"]
export type VerifySharedAccessInput = DTO["VerifySharedAccessDto"]

// Статусы — из схемы SharedAccessInfoResponseDto.status
export type SharedAccessPublicStatus = SharedAccessInfo["status"]
