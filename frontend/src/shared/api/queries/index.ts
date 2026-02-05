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
		infinite: () => [...queryKeys.records.all, "infinite"] as const,
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
} as const
