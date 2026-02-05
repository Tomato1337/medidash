import type { DTO } from "@/shared/api/api"

// =============================================================================
// USER TYPES
// =============================================================================

export type User = DTO["UserResponseDto"]

// =============================================================================
// AUTH INPUT TYPES
// =============================================================================

export type LoginInput = DTO["AuthLoginDto"]
export type RegisterInput = DTO["AuthRegisterDto"]
