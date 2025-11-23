import { db } from "./indexedDB"
import type {
	PersistedClient,
	Persister,
} from "@tanstack/react-query-persist-client"

/**
 * Creates an Indexed DB persister using Dexie
 * @see https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
 */
export function createIDBPersister(key: string = "reactQuery") {
	return {
		persistClient: async (client: PersistedClient) => {
			// Используем отдельную таблицу для React Query кэша
			await db.table("queryCache").put({ id: key, data: client })
		},
		restoreClient: async () => {
			const result = await db.table("queryCache").get(key)
			return result?.data as PersistedClient | undefined
		},
		removeClient: async () => {
			await db.table("queryCache").delete(key)
		},
	} as Persister
}
