// =============================================================================
// Auth Module - Public API
// =============================================================================

// Domain Layer - schemas and types
export {
	loginSchema,
	registerSchema,
	type LoginForm,
	type RegisterForm,
} from "./domain/schemas"
export type { User, LoginInput, RegisterInput } from "./domain/types"

// Application Layer - use cases and query options
export { useUser, useLogin, useRegister } from "./application/useAuth"
export {
	userQueryOptions,
	loginMutationOptions,
	registerMutationOptions,
} from "./application/queries"

// Infrastructure Layer - pure API functions (for direct use if needed)
export { login, register, getUser } from "./infrastructure/authApi"
