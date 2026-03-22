import type { RecordsFilters } from "@/modules/records"

// =============================================================================
// Shared Query Keys Registry
// =============================================================================

/**
 * Centralized query key factory for TanStack Query.
 * Provides consistent key structure across the app.
 */
export const queryKeys = {
	// Auth
	auth: {
		all: ["auth"] as const,
		user: () => [...queryKeys.auth.all, "user"] as const,
	},

	// Records
	records: {
		all: ["records"] as const,
		list: () => [...queryKeys.records.all, "list"] as const,
		detail: (id: string) =>
			[...queryKeys.records.all, "detail", id] as const,
		infinite: (filters?: RecordsFilters) =>
			[...queryKeys.records.all, "infinite", filters ?? {}] as const,
	},

	// Documents
	documents: {
		all: ["documents"] as const,
		detail: (id: string) =>
			[...queryKeys.documents.all, "detail", id] as const,
	},

	// Tags
	tags: {
		all: () => ["tags"] as const,
	},

	// Shared Access
	sharedAccess: {
		all: ["shared-access"] as const,
		list: () => [...queryKeys.sharedAccess.all, "list"] as const,
		sessions: (accessId: string) =>
			[...queryKeys.sharedAccess.all, "sessions", accessId] as const,
		info: (token: string) =>
			[...queryKeys.sharedAccess.all, "info", token] as const,
		isAuthorized: (token: string) =>
			[...queryKeys.sharedAccess.all, "is-authorized", token] as const,
	},
} as const

// =============================================================================
// Mutation Keys
// =============================================================================

export const mutationKeys = {
	auth: {
		login: ["auth", "login"] as const,
		register: ["auth", "register"] as const,
		logout: ["auth", "logout"] as const,
	},

	records: {
		create: ["records", "create"] as const,
		retry: ["records", "retry"] as const,
		delete: ["records", "delete"] as const,
	},

	documents: {
		download: ["documents", "download"] as const,
		upload: ["documents", "upload"] as const,
	},

	sharedAccess: {
		create: ["shared-access", "create"] as const,
		revoke: ["shared-access", "revoke"] as const,
		revokeSession: ["shared-access", "revoke-session"] as const,
	},
} as const
