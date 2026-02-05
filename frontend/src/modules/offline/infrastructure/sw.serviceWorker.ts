/// <reference lib="webworker" />

import { DocumentStatus } from "@shared-types"

declare const self: ServiceWorkerGlobalScope

// Service Worker for medical-docs-db
// Intercepts /api/records/* requests and provides IndexedDB fallback

const DB_NAME = "medical-docs-db"
const STORE_NAME = "records"

// =============================================================================
// INSTALL & ACTIVATE
// =============================================================================

self.addEventListener("install", () => {
	console.log("SW: Installing...")
	self.skipWaiting()
})

self.addEventListener("activate", (event) => {
	console.log("SW: Activating...")
	event.waitUntil(self.clients.claim())
})

// =============================================================================
// INDEXEDDB HELPERS
// =============================================================================

function openDB() {
	return new Promise((resolve, reject) => {
		// Open without version to use existing DB version
		const request = indexedDB.open(DB_NAME)
		request.onerror = () => reject(request.error)
		request.onsuccess = () => resolve(request.result)
	})
}

async function getRecord(id: string | undefined) {
	if (!id) {
		return null
	}
	try {
		const db = (await openDB()) as IDBDatabase
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, "readonly")
			const store = tx.objectStore(STORE_NAME)
			const request = store.get(id)
			request.onerror = () => reject(request.error)
			request.onsuccess = () => {
				db.close()
				resolve(request.result)
			}
		})
	} catch (error) {
		console.error("SW: Error reading IndexedDB:", error)
		return null
	}
}

// =============================================================================
// FETCH INTERCEPTION
// =============================================================================

self.addEventListener("fetch", (event) => {
	const url = new URL(event.request.url)

	// Only intercept /api/records/* GET requests
	if (
		url.pathname.match(/^\/api\/records\/[^/]+$/) &&
		event.request.method === "GET"
	) {
		event.respondWith(handleGetRecord(event.request, url))
	}
})

// =============================================================================
// GET /api/records/{id}
// =============================================================================

async function handleGetRecord(request: Request, url: URL) {
	const id = url.pathname.split("/").pop()

	try {
		const response = await fetch(request)
		const localRecord = await getRecord(id)

		if (response.ok) {
			const data = await response.clone().json()

			// Return local data if:
			// 1. Server documents array is empty
			// 2. Local record is still uploading/compressing
			if (
				localRecord &&
				(!data.documents?.length ||
					(localRecord as any).status === DocumentStatus.UPLOADING ||
					(localRecord as any).status === DocumentStatus.COMPRESSING)
			) {
				console.log("SW: Returning local record for", id)
				return jsonResponse(localRecord)
			}

			return response
		}

		// 404 - try local data
		if (response.status === 404 && localRecord) {
			console.log("SW: 404, returning local record for", id)
			return jsonResponse(localRecord)
		}

		return response
	} catch (error) {
		// Network error - try local data
		console.log("SW: Network error, trying local for", id)
		const localRecord = await getRecord(id)
		if (localRecord) {
			return jsonResponse(localRecord)
		}
		throw error
	}
}

// =============================================================================
// HELPERS
// =============================================================================

function jsonResponse(record: any) {
	// Clone record to avoid mutating original
	const recordData = { ...record }

	// Serialize documents to preserve File/Blob metadata
	if (recordData.documents && Array.isArray(recordData.documents)) {
		recordData.documents = recordData.documents.map((doc: any) => ({
			...doc,
			file: doc.file
				? {
						name: doc.file.name,
						size: doc.file.size,
						type: doc.file.type,
					}
				: doc.file,
			compressed:
				doc.compressed instanceof Blob
					? {
							size: doc.compressed.size,
							type: doc.compressed.type,
						}
					: doc.compressed,
		}))
	}

	return new Response(JSON.stringify(recordData), {
		status: 200,
		headers: {
			"Content-Type": "application/json",
			"X-Data-Source": "indexeddb",
		},
	})
}
